<?php

namespace App\Actions\Task;

use App\Models\TaskTarget;
use App\Support\Notifications\Notify;

/**
 * A8 / PRD Notifikasi: tenggat H-1 lewat lonceng + email, hanya untuk
 * praktikan yang belum mengumpulkan. Sekali per target (reminded_at).
 */
class RemindDeadlines
{
    public function __invoke(): int
    {
        $sent = 0;

        TaskTarget::whereNull('reminded_at')
            ->whereBetween('due_at', [now(), now()->addDay()])
            ->whereHas('task', fn ($q) => $q->where('status', 'published'))
            ->with(['task', 'labClass.course'])
            ->get()
            ->each(function (TaskTarget $target) use (&$sent) {
                $pending = $target->labClass->enrollments()
                    ->whereNotIn('user_id', $target->submissions()->where('is_current', true)->select('user_id'))
                    ->pluck('user_id')->all();

                Notify::send($pending, 'deadline', "Tenggat besok: {$target->task->title}",
                    "{$target->labClass->course->name} · {$target->labClass->name} — tenggat ".$target->due_at->locale('id')->translatedFormat('l, d M Y H:i').' WIB.',
                    '/praktikan/tasks/'.$target->id, mail: true);

                $target->forceFill(['reminded_at' => now()])->save();
                $sent += count($pending);
            });

        return $sent;
    }
}
