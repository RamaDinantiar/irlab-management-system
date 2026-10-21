<?php

namespace App\Jobs;

use App\Actions\Honor\ComputeHonorRecaps;
use App\Events\ExportFinished;
use App\Models\Export;
use App\Models\HonorRecap;
use App\Models\SupervisionReport;
use App\Support\Files\FileStore;
use App\Support\Reports\DailyActivityReport;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Queue\Queueable;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;
use Throwable;
use ZipArchive;

/**
 * FR-AGN-02/03: rekap laporan mengawas (hanya yang Diverifikasi), memakai
 * template Word resmi lab (lihat DailyActivityReport).
 *  - zip   : satu file Word per hari dalam ZIP (satu bulan)
 *  - excel : sheet Ringkasan (jam × tarif = estimasi honor) + Detail (satu bulan)
 * Single DOC (satu tanggal) langsung diunduh tanpa antrean: GenerateController::daily().
 */
class GenerateMonthlyReport implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public function __construct(public Export $export) {}

    public function handle(FileStore $files, ComputeHonorRecaps $recaps): void
    {
        $export = $this->export;
        $export->update(['status' => 'processing', 'progress' => 5]);

        $month = $export->params_json['month'];
        $start = CarbonImmutable::createFromFormat('Y-m', $month)->startOfMonth();
        $reports = self::reports($export->user_id, $month, $export->params_json['scope'] ?? 'mine');

        // US-A04-4: bukan file kosong.
        if ($reports->isEmpty()) {
            $export->update(['status' => 'empty', 'progress' => 100, 'error' => 'Tidak ada laporan pada periode ini.']);
            ExportFinished::dispatch($export);

            return;
        }

        $tmp = tempnam(sys_get_temp_dir(), 'rekap');
        $label = $start->translatedFormat('F-Y');
        $days = $reports->groupBy(fn (SupervisionReport $r) => $r->date->toDateString());

        try {
            [$name, $mime] = match ($export->type) {
                'zip' => $this->zip($tmp, $days, $export, $label),
                default => $this->excel($tmp, $reports, $recaps($month), $export->params_json['scope'] ?? 'mine', $export->user_id, $label),
            };

            $file = $files->storeGenerated($tmp, $name, $mime, 'export', $export);
            $export->update(['status' => 'done', 'progress' => 100, 'file_id' => $file->id, 'expires_at' => now()->addDay()]);
        } finally {
            @unlink($tmp);
        }

        ExportFinished::dispatch($export);
    }

    public function failed(?Throwable $exception): void
    {
        $this->export->update(['status' => 'failed', 'error' => 'Gagal membuat rekap. Coba lagi atau hubungi Admin.']);
    }

    /**
     * @return Collection<int, SupervisionReport>
     */
    public static function reports(int $userId, string $month, string $scope, ?string $date = null): Collection
    {
        $start = CarbonImmutable::createFromFormat('Y-m', $month)->startOfMonth();
        $range = $date ? [$date, $date] : [$start->toDateString(), $start->endOfMonth()->toDateString()];

        return SupervisionReport::where('status', 'verified')
            ->whereDateBetween('date', $range)
            ->when($scope !== 'all', fn ($q) => $q->where(fn ($w) => $w->where('user_id', $userId)->orWhereHas('assistants', fn ($a) => $a->whereKey($userId))))
            ->with(['labClass.course', 'room', 'assistants', 'user', 'verifier', 'photos'])
            ->orderBy('date')->orderBy('start_time')
            ->get();
    }

    /**
     * @param  \Illuminate\Support\Collection<string, Collection<int, SupervisionReport>>  $days
     * @return array{0: string, 1: string}
     */
    private function zip(string $tmp, $days, Export $export, string $label): array
    {
        $zip = new ZipArchive;
        $zip->open($tmp, ZipArchive::OVERWRITE);
        $parts = [];
        $done = 0;

        foreach ($days as $date => $reports) {
            $day = CarbonImmutable::parse($date);
            $parts[] = $part = tempnam(sys_get_temp_dir(), 'harian');
            DailyActivityReport::save($day, $reports, $part);
            $zip->addFile($part, self::dailyName($day));
            $export->update(['progress' => 5 + (int) (90 * ++$done / $days->count())]);
        }

        $zip->close();
        array_map('unlink', $parts);

        return ["laporan-kegiatan-harian-{$label}.zip", 'application/zip'];
    }

    /** "Laporan Kegiatan Harian 2026-03-09 Senin.docx" — urut tanggal saat ZIP dibuka. */
    public static function dailyName(CarbonImmutable $date): string
    {
        return 'Laporan Kegiatan Harian '.$date->translatedFormat('Y-m-d l').'.docx';
    }

    /**
     * @param  Collection<int, SupervisionReport>  $reports
     * @param  \Illuminate\Support\Collection<int, HonorRecap>  $recaps
     * @return array{0: string, 1: string}
     */
    private function excel(string $tmp, Collection $reports, $recaps, string $scope, int $userId, string $label): array
    {
        $writer = new Writer;
        $writer->openToFile($tmp);
        $writer->getCurrentSheet()->setName('Ringkasan');
        $writer->addRow(Row::fromValues(['NIM', 'Nama Asisten', 'Total Shift', 'Total Jam', 'Tarif per Jam (Rp)', 'Estimasi Honor (Rp)', 'Status']));

        foreach ($recaps->when($scope !== 'all', fn ($c) => $c->where('user_id', $userId)) as $recap) {
            $writer->addRow(Row::fromValues([
                $recap->user->nim, $recap->user->name, $recap->total_shifts, (float) $recap->total_hours,
                $recap->rate_per_hour, $recap->amount, $recap->status === 'final' ? 'Final' : 'Draft',
            ]));
        }

        $writer->addNewSheetAndMakeItCurrent()->setName('Detail');
        $writer->addRow(Row::fromValues(['Tanggal', 'Mulai', 'Selesai', 'Jam', 'Mata Kuliah / Kegiatan', 'Kelas', 'Ruang', 'Asisten Jaga', 'Materi', 'Catatan', 'Diverifikasi Oleh']));

        foreach ($reports as $report) {
            $writer->addRow(Row::fromValues([
                $report->date->toDateString(), substr($report->start_time, 0, 5), substr($report->end_time, 0, 5), $report->hours(),
                $report->labClass?->course->name ?? $report->activity, $report->labClass?->name, $report->room?->name,
                $report->assistants->pluck('name')->join(', '), $report->material, $report->notes, $report->verifier?->name,
            ]));
        }

        $writer->close();

        return ["rekap-mengawas-{$label}.xlsx", 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    }
}
