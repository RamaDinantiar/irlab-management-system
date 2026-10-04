<?php

namespace App\Actions\Grade;

use App\Models\AuditLog;
use App\Models\Grade;
use App\Models\Submission;
use App\Models\TaskTarget;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * US-A02-3 / FR-AG-03: Simpan Batch — semua perubahan dalam satu transaksi;
 * satu baris invalid → tidak ada yang tersimpan. Optimistic locking lewat
 * `version` mencegah dua asisten menimpa nilai yang sama.
 */
class SaveGradesBatch
{
    /**
     * @param  list<array{submission_id: int, score: float|int|string|null, feedback: string|null, version: int|null}>  $rows
     */
    public function __invoke(User $grader, TaskTarget $target, array $rows): int
    {
        $max = $target->task->max_score;
        $errors = [];

        $submissions = Submission::where('task_target_id', $target->id)
            ->whereIn('id', array_column($rows, 'submission_id'))
            ->where('is_current', true)
            ->pluck('id')->all();

        foreach ($rows as $index => $row) {
            if (! in_array((int) $row['submission_id'], $submissions, true)) {
                $errors["grades.{$index}.score"] = 'Submission tidak ditemukan pada tugas ini.';
            } elseif ($row['score'] !== null && $row['score'] !== '' && (! is_numeric($row['score']) || $row['score'] < 0 || $row['score'] > $max)) {
                $errors["grades.{$index}.score"] = "Nilai harus 0–{$max}.";
            } elseif (mb_strlen((string) ($row['feedback'] ?? '')) > 5000) {
                $errors["grades.{$index}.feedback"] = 'Feedback maksimal 5.000 karakter.';
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return DB::transaction(function () use ($grader, $rows) {
            $existing = Grade::whereIn('submission_id', array_column($rows, 'submission_id'))
                ->lockForUpdate()->get()->keyBy('submission_id');

            $conflicts = [];
            foreach ($rows as $index => $row) {
                $grade = $existing[(int) $row['submission_id']] ?? null;
                if ($grade && (int) ($row['version'] ?? 0) !== $grade->version) {
                    $conflicts["grades.{$index}.score"] = "Nilai ini baru saja diubah oleh {$grade->grader?->name}. Muat ulang halaman sebelum menyimpan.";
                }
            }

            if ($conflicts !== []) {
                throw ValidationException::withMessages($conflicts);
            }

            foreach ($rows as $row) {
                $grade = $existing[(int) $row['submission_id']] ?? new Grade(['submission_id' => (int) $row['submission_id'], 'version' => 0]);
                $before = $grade->exists ? $grade->only(['score', 'feedback']) : null;

                $grade->fill([
                    'score' => $row['score'] === '' ? null : $row['score'],
                    'feedback' => $row['feedback'] !== null && trim($row['feedback']) !== '' ? $row['feedback'] : null,
                    'graded_by' => $grader->id,
                    'graded_at' => now(),
                ]);
                $grade->version++;
                $grade->save();

                AuditLog::record('grade.saved', $grade, $before, $grade->only(['score', 'feedback', 'status']));
            }

            return count($rows);
        });
    }
}
