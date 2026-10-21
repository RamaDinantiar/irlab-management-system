<?php

namespace App\Support\Dashboard;

use App\Enums\TaskType;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\TaskTarget;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Sesi kelas yang sedang berlangsung (otomatis sesuai jam kelas) untuk panel
 * dashboard: Asisten → pintasan presensi & membuat test; Praktikan → test yang
 * sedang dibuka asisten di kelas itu.
 */
class LiveSessions
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public static function forAssistant(User $user): array
    {
        return self::running(fn (Builder $q) => $q->taughtBy($user))
            ->map(function (Meeting $meeting) {
                $class = $meeting->labClass;

                return [
                    ...self::summary($meeting),
                    'members' => $class->enrollments_count,
                    'attendanceCount' => $meeting->attendances_count,
                    'tasks' => self::openTargets($class)
                        ->withCount(['submissions as submitted' => fn ($q) => $q->where('is_current', true)])
                        ->get()
                        ->map(fn (TaskTarget $t) => [
                            'id' => $t->id,
                            'taskId' => $t->task_id,
                            'title' => $t->task->title,
                            'type' => $t->task->type->value,
                            'dueAt' => $t->due_at?->toIso8601String(),
                            'submitted' => $t->submitted,
                        ])->values()->all(),
                ];
            })->values()->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function forStudent(User $user): array
    {
        return self::running(fn (Builder $q) => $q->whereHas('enrollments', fn ($e) => $e->where('user_id', $user->id)))
            ->map(function (Meeting $meeting) use ($user) {
                $class = $meeting->labClass;

                return [
                    ...self::summary($meeting),
                    'seat' => $class->seatContracts()->where('user_id', $user->id)->with('seat')->first()?->seat->label,
                    // Hanya Pre/Post-Test; Laporan tetap lewat menu Task.
                    'tests' => self::openTargets($class)
                        ->whereHas('task', fn ($q) => $q->whereIn('type', [TaskType::Pretest, TaskType::Posttest]))
                        ->withExists(['submissions as submitted' => fn ($q) => $q->where('user_id', $user->id)->where('is_current', true)])
                        ->get()
                        ->map(fn (TaskTarget $t) => [
                            'id' => $t->id,
                            'title' => $t->task->title,
                            'type' => $t->task->type->value,
                            'dueAt' => $t->due_at?->toIso8601String(),
                            'submitted' => (bool) $t->submitted,
                            'href' => "/praktikan/tasks/{$t->id}",
                        ])->values()->all(),
                ];
            })->values()->all();
    }

    /**
     * @param  callable(Builder<LabClass>): mixed  $classScope
     * @return Collection<int, Meeting>
     */
    private static function running(callable $classScope): Collection
    {
        return Meeting::running()
            ->whereHas('labClass', fn ($q) => $classScope($q))
            ->with(['labClass' => fn ($q) => $q->withCount('enrollments'), 'labClass.course', 'labClass.room'])
            ->withCount('attendances')
            ->get()
            ->sortBy(fn (Meeting $m) => $m->labClass->start_time)
            ->values();
    }

    /**
     * @return array<string, mixed>
     */
    private static function summary(Meeting $meeting): array
    {
        $class = $meeting->labClass;

        return [
            'meetingId' => $meeting->id,
            'classId' => $class->id,
            'course' => $class->course->name,
            'className' => $class->name,
            'number' => $meeting->number,
            'topic' => $meeting->topic,
            'room' => $class->room->name,
            'startsAt' => $meeting->startsAt()->toIso8601String(),
            'endsAt' => $meeting->endsAt()->toIso8601String(),
        ];
    }

    /**
     * Tugas terbit di kelas ini yang sedang terbuka (sama dengan TaskTarget::state()).
     *
     * @return Builder<TaskTarget>
     */
    private static function openTargets(LabClass $class): Builder
    {
        return TaskTarget::where('class_id', $class->id)
            ->open()
            ->with('task')
            ->orderBy('due_at');
    }
}
