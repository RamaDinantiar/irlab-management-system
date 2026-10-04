<?php

namespace App\Actions\Report;

use App\Events\SupervisionReportSubmitted;
use App\Models\AuditLog;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\Shift;
use App\Models\SupervisionReport;
use App\Models\User;
use App\Support\Files\FileStore;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * US-A03 / FR-AR-01: buat atau ubah berita acara mengawas. `submit` = kirim
 * ke Sekretaris (Diajukan); tanpa itu tersimpan sebagai Draft.
 */
class SaveSupervisionReport
{
    public function __construct(private FileStore $files) {}

    /**
     * @param  array{shift_id?: int|null, date: string, start_time: string, end_time: string, class_id?: int|null, activity: string, material?: string|null, present_count: int, lab_condition: string, notes: string, assistant_ids: list<int>, submit?: bool}  $data
     */
    public function __invoke(User $author, array $data, ?UploadedFile $photo = null, ?SupervisionReport $report = null): SupervisionReport
    {
        if ($report && ! $report->isEditableBy($author)) {
            throw ValidationException::withMessages(['report' => $report->isLocked()
                ? 'Laporan sudah terkunci (lewat H+1 pukul 23.59). Hubungi Admin untuk membuka kunci.'
                : 'Laporan ini tidak dapat diubah.']);
        }

        $date = CarbonImmutable::parse($data['date']);
        if ($date->isAfter(today())) {
            throw ValidationException::withMessages(['date' => 'Laporan hanya untuk shift hari ini atau sebelumnya.']);
        }

        $shift = isset($data['shift_id']) ? Shift::find($data['shift_id']) : null;
        if ($shift && $shift->user_id !== $author->id && ! $author->isAdmin()) {
            throw ValidationException::withMessages(['shift_id' => 'Shift ini bukan milik Anda.']);
        }

        if ($shift && SupervisionReport::where('shift_id', $shift->id)->when($report, fn ($q) => $q->whereKeyNot($report->id))->exists()) {
            throw ValidationException::withMessages(['shift_id' => 'Shift ini sudah memiliki laporan.']);
        }

        $team = array_values(array_unique(array_map('intval', $data['assistant_ids'])));
        if (! in_array($author->id, $team, true)) {
            throw ValidationException::withMessages(['assistant_ids' => 'Anda harus termasuk dalam tim asisten jaga.']);
        }

        $class = isset($data['class_id']) ? LabClass::find($data['class_id']) : $shift?->labClass;

        return DB::transaction(function () use ($author, $data, $photo, $report, $date, $shift, $team, $class) {
            $before = $report?->only(['status', 'start_time', 'end_time', 'notes']);
            $submit = (bool) ($data['submit'] ?? false);

            $report ??= new SupervisionReport([
                'user_id' => $author->id,
                'semester_id' => Semester::current()?->id ?? $class?->semester_id,
                'editable_until' => $date->addDay()->endOfDay(),
            ]);

            $report->fill([
                'shift_id' => $shift?->id,
                'date' => $date->toDateString(),
                'start_time' => $data['start_time'],
                'end_time' => $data['end_time'],
                'class_id' => $class?->id,
                'room_id' => $shift?->room_id ?? $class?->room_id,
                'activity' => $data['activity'],
                'material' => $data['material'] ?? null,
                'present_count' => $data['present_count'],
                'lab_condition' => $data['lab_condition'],
                'notes' => $data['notes'],
            ]);

            if ($submit) {
                $report->status = 'submitted';
                $report->submitted_at = now();
                $report->return_note = null;
            } elseif (! $report->exists || $report->status === 'returned') {
                $report->status = $report->exists ? 'returned' : 'draft';
            }

            $report->save();
            $report->assistants()->sync(collect($team)->mapWithKeys(fn ($id, $i) => [$id => ['position' => $i + 1]])->all());

            if ($photo) {
                $report->photos()->get()->each->delete();
                $this->files->store($photo, ['image'], 'report_photo', $report, $author, 'photo');
            }

            AuditLog::record($before ? 'report.updated' : 'report.created', $report, $before, $report->only(['status', 'start_time', 'end_time', 'notes']));

            if ($submit) {
                SupervisionReportSubmitted::dispatch($report);
            }

            return $report;
        });
    }
}
