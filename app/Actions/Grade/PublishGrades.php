<?php

namespace App\Actions\Grade;

use App\Events\GradesPublished;
use App\Models\AuditLog;
use App\Models\Grade;
use App\Models\TaskTarget;
use Illuminate\Support\Facades\DB;

/**
 * FR-AG-05 / US-A02-5: publikasikan nilai Draft satu tugas di satu kelas;
 * hanya nilai yang sudah terisi. Praktikan diberi notifikasi.
 */
class PublishGrades
{
    public function __invoke(TaskTarget $target): int
    {
        return DB::transaction(function () use ($target) {
            $grades = Grade::whereHas('submission', fn ($q) => $q->where('task_target_id', $target->id)->where('is_current', true))
                ->where('status', 'draft')
                ->whereNotNull('score')
                ->with('submission')
                ->lockForUpdate()
                ->get();

            foreach ($grades as $grade) {
                $grade->forceFill(['status' => 'published', 'published_at' => now()])->save();
            }

            if ($grades->isNotEmpty()) {
                AuditLog::record('grade.published', $target->task, null, ['class_id' => $target->class_id, 'count' => $grades->count()]);
                GradesPublished::dispatch($target, $grades->pluck('submission.user_id')->all());
            }

            return $grades->count();
        });
    }
}
