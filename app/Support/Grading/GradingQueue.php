<?php

namespace App\Support\Grading;

use App\Enums\ApprovalStatus;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\Submission;
use App\Models\TaskTarget;
use App\Models\User;

/**
 * Antrean penilaian (FR-AD-4 / FR-ADM dashboard): tugas terbuka per kelas
 * beserta jumlah submission vs. yang sudah dinilai, yang paling tertinggal
 * di atas.
 */
class GradingQueue
{
    /**
     * @return array<int, array{id: string, course: string, className: string, task: string, type: string, graded: int, submitted: int, href: string}>
     */
    public static function for(User $user, int $limit = 5): array
    {
        $semester = Semester::current();

        if (! $semester) {
            return [];
        }

        $classIds = LabClass::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)->taughtBy($user)->select('id');

        return TaskTarget::whereIn('class_id', $classIds)
            ->whereNotNull('open_at')->where('open_at', '<=', now())
            ->whereHas('task', fn ($q) => $q->where('status', 'published'))
            ->with(['task', 'labClass.course'])
            ->withCount([
                'submissions as submitted_count' => fn ($q) => $q->where('is_current', true),
                'submissions as graded_count' => fn ($q) => $q->where('is_current', true)->whereHas('grade', fn ($g) => $g->whereNotNull('score')),
            ])
            ->get()
            ->filter(fn (TaskTarget $t) => $t->submitted_count > 0)
            ->sortByDesc(fn (TaskTarget $t) => [$t->submitted_count - $t->graded_count, $t->submitted_count])
            ->take($limit)
            ->map(fn (TaskTarget $t) => [
                'id' => "gq-{$t->id}",
                'course' => $t->labClass->course->name,
                'className' => $t->labClass->name,
                'task' => $t->task->title,
                'type' => $t->task->type->value,
                'graded' => $t->graded_count,
                'submitted' => $t->submitted_count,
                'href' => route('asisten.grades.index', ['type' => $t->task->type->slug(), 'class' => $t->class_id, 'target' => $t->id], false),
            ])
            ->values()
            ->all();
    }

    /**
     * Jumlah Pre/Post-test yang belum dinilai (kartu "belum dinilai" Figma).
     */
    public static function pendingTests(User $user): int
    {
        $semester = Semester::current();

        if (! $semester) {
            return 0;
        }

        return Submission::where('is_current', true)
            ->whereDoesntHave('grade', fn ($g) => $g->whereNotNull('score'))
            ->whereHas('target', fn ($q) => $q
                ->whereIn('class_id', LabClass::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)->taughtBy($user)->select('id'))
                ->whereHas('task', fn ($t) => $t->where('status', 'published')->whereIn('type', ['pretest', 'posttest'])))
            ->count();
    }
}
