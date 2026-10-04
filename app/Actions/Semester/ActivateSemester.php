<?php

namespace App\Actions\Semester;

use App\Enums\SemesterStatus;
use App\Models\AuditLog;
use App\Models\Semester;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * US-D01-2: mengaktifkan semester Draft. Hanya satu semester berstatus Aktif;
 * semester aktif sebelumnya otomatis menjadi Arsip (read-only).
 */
class ActivateSemester
{
    public function __invoke(Semester $semester): Semester
    {
        return DB::transaction(function () use ($semester) {
            // Kunci semua baris aktif + target agar dua admin tidak mengaktifkan bersamaan.
            $semester = Semester::whereKey($semester->getKey())->lockForUpdate()->firstOrFail();
            $previous = Semester::active()->lockForUpdate()->first();

            if ($semester->status !== SemesterStatus::Draft) {
                throw ValidationException::withMessages([
                    'semester' => 'Hanya semester berstatus Draft yang dapat diaktifkan.',
                ]);
            }

            if ($previous) {
                $previous->forceFill([
                    'status' => SemesterStatus::Archived,
                    'archived_at' => now(),
                ])->save();

                AuditLog::record('semester.archived', $previous, ['status' => 'active'], ['status' => 'archived']);
            }

            $semester->forceFill([
                'status' => SemesterStatus::Active,
                'activated_at' => now(),
            ])->save();

            AuditLog::record('semester.activated', $semester, ['status' => 'draft'], [
                'status' => 'active',
                'previous_semester_id' => $previous?->id,
            ]);

            return $semester;
        });
    }
}
