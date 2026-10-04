<?php

namespace App\Jobs;

use App\Actions\Honor\ComputeHonorRecaps;
use App\Events\ExportFinished;
use App\Models\Export;
use App\Models\HonorRecap;
use App\Models\Semester;
use App\Models\SupervisionReport;
use App\Support\Files\FileStore;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Foundation\Queue\Queueable;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;
use Throwable;
use ZipArchive;

/**
 * FR-AGN-02/03: rekap bulanan laporan mengawas (hanya yang Diverifikasi).
 *  - zip   : satu PDF per hari (DomPDF) dalam ZIP
 *  - pdf   : satu PDF gabungan (Figma "Single DOC")
 *  - excel : sheet Ringkasan (jam × tarif = estimasi honor) + Detail
 */
class GenerateMonthlyReport implements ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public function __construct(public Export $export) {}

    public function handle(FileStore $files, ComputeHonorRecaps $recaps): void
    {
        // DomPDF boros memori untuk banyak halaman; batas dinaikkan khusus job ini.
        ini_set('memory_limit', '512M');

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
        $label = $start->locale('id')->translatedFormat('F-Y');
        $days = $reports->groupBy(fn (SupervisionReport $r) => $r->date->toDateString());
        $semester = Semester::find($reports->first()->semester_id)?->name ?? '';

        try {
            [$name, $mime] = match ($export->type) {
                'zip' => $this->zip($tmp, $days, $semester, $export, $label),
                'pdf' => $this->pdf($tmp, $days, $semester, $label),
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
    public static function reports(int $userId, string $month, string $scope): Collection
    {
        $start = CarbonImmutable::createFromFormat('Y-m', $month)->startOfMonth();

        return SupervisionReport::where('status', 'verified')
            ->whereDateBetween('date', [$start->toDateString(), $start->endOfMonth()->toDateString()])
            ->when($scope !== 'all', fn ($q) => $q->where(fn ($w) => $w->where('user_id', $userId)->orWhereHas('assistants', fn ($a) => $a->whereKey($userId))))
            ->with(['labClass.course', 'room', 'assistants', 'user', 'verifier'])
            ->orderBy('date')->orderBy('start_time')
            ->get();
    }

    /**
     * @param  \Illuminate\Support\Collection<string, Collection<int, SupervisionReport>>  $days
     * @return array{0: string, 1: string}
     */
    private function zip(string $tmp, $days, string $semester, Export $export, string $label): array
    {
        $zip = new ZipArchive;
        $zip->open($tmp, ZipArchive::OVERWRITE);
        $done = 0;

        foreach ($days as $date => $reports) {
            $pdf = Pdf::loadView('pdf.supervision-day', ['days' => collect([$date => $reports]), 'semester' => $semester])->setPaper('a4', 'landscape');
            $zip->addFromString(CarbonImmutable::parse($date)->locale('id')->translatedFormat('Y-m-d l').'.pdf', $pdf->output());
            unset($pdf);
            gc_collect_cycles();
            $export->update(['progress' => 5 + (int) (90 * ++$done / $days->count())]);
        }

        $zip->close();

        return ["berita-acara-{$label}.zip", 'application/zip'];
    }

    /**
     * @return array{0: string, 1: string}
     */
    private function pdf(string $tmp, $days, string $semester, string $label): array
    {
        file_put_contents($tmp, Pdf::loadView('pdf.supervision-day', ['days' => $days, 'semester' => $semester])->setPaper('a4', 'landscape')->output());

        return ["berita-acara-{$label}.pdf", 'application/pdf'];
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
        $writer->addRow(Row::fromValues(['Tanggal', 'Mulai', 'Selesai', 'Jam', 'Mata Kuliah / Kegiatan', 'Kelas', 'Ruang', 'Asisten Jaga', 'Hadir', 'Kondisi', 'Materi', 'Catatan', 'Diverifikasi Oleh']));

        foreach ($reports as $report) {
            $writer->addRow(Row::fromValues([
                $report->date->toDateString(), substr($report->start_time, 0, 5), substr($report->end_time, 0, 5), $report->hours(),
                $report->labClass?->course->name ?? $report->activity, $report->labClass?->name, $report->room?->name,
                $report->assistants->pluck('name')->join(', '), $report->present_count,
                SupervisionReport::CONDITIONS[$report->lab_condition] ?? $report->lab_condition,
                $report->material, $report->notes, $report->verifier?->name,
            ]));
        }

        $writer->close();

        return ["rekap-mengawas-{$label}.xlsx", 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    }
}
