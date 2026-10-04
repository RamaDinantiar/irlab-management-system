<?php

namespace App\Actions\Semester;

use App\Enums\ApprovalStatus;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Semester;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * US-D01-3: salin struktur dari semester lain — Mata Kuliah & bobot nilai —
 * tanpa data praktikan, submission, nilai, maupun asisten pengampu.
 * Mata kuliah dengan kode yang sudah ada di semester tujuan dilewati.
 *
 * Denah lab & template tugas ikut disalin setelah modulnya dibangun.
 */
class CopySemesterStructure
{
    /**
     * @return array{copied: int, skipped: int}
     */
    public function __invoke(Semester $source, Semester $target): array
    {
        if ($source->is($target) || ! $target->isEditable()) {
            throw ValidationException::withMessages([
                'source_id' => 'Pilih semester sumber lain; semester tujuan harus Draft atau Aktif.',
            ]);
        }

        return DB::transaction(function () use ($source, $target) {
            $existing = Course::forSemester($target)->pluck('code')->all();
            $copied = 0;
            $skipped = 0;

            Course::forSemester($source)
                ->where('approval_status', ApprovalStatus::Approved)
                ->orderBy('code')
                ->each(function (Course $course) use ($target, $existing, &$copied, &$skipped) {
                    if (in_array($course->code, $existing, true)) {
                        $skipped++;

                        return;
                    }

                    $copy = $course->replicate(['proposed_by', 'approved_by', 'approved_at', 'rejection_reason']);
                    $copy->semester_id = $target->id;
                    $copy->approval_status = ApprovalStatus::Approved;
                    $copy->approved_by = auth()->id();
                    $copy->approved_at = now();
                    $copy->save();
                    $copied++;
                });

            AuditLog::record('semester.structure_copied', $target, null, [
                'source_semester_id' => $source->id,
                'courses_copied' => $copied,
                'courses_skipped' => $skipped,
            ]);

            return ['copied' => $copied, 'skipped' => $skipped];
        });
    }
}
