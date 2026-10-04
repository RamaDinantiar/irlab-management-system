<?php

namespace App\Listeners;

use App\Events\MeetingStarted;
use App\Models\AuditLog;
use App\Models\TaskTarget;

/**
 * FR-AD-01 & FR-PT-06: saat sesi dimulai, Pre-test yang dijadwalkan untuk
 * pertemuan ini dibuka selama `window_minutes` (mis. 15 menit pertama).
 */
class OpenScheduledPretests
{
    public function handle(MeetingStarted $event): void
    {
        TaskTarget::where('meeting_id', $event->meeting->id)
            ->whereNull('open_at')
            ->whereNotNull('window_minutes')
            ->whereHas('task', fn ($q) => $q->where('type', 'pretest')->where('status', 'published'))
            ->get()
            ->each(function (TaskTarget $target) {
                $target->update([
                    'open_at' => now(),
                    'due_at' => now()->addMinutes($target->window_minutes),
                ]);
                AuditLog::record('task.pretest_opened', $target->task, null, ['class_id' => $target->class_id]);
            });
    }
}
