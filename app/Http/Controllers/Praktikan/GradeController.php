<?php

namespace App\Http\Controllers\Praktikan;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Grade;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Semester;
use App\Models\Submission;
use App\Models\TaskTarget;
use App\Support\Grading\FinalScore;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Praktikan › Grade (FR-PG, US-P03) — read-only. Layout Figma "Grade (Nilai
 * Post/Pre Test) - Praktikan": kartu mata kuliah, statistik, tabel per pertemuan.
 */
class GradeController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $semester = Semester::current();

        $classes = $semester
            ? LabClass::forSemester($semester)
                ->whereHas('enrollments', fn ($q) => $q->where('user_id', $user->id))
                ->with(['course', 'assistants', 'meetings'])
                ->orderBy('day_of_week')->get()
            : collect();

        // Semua nilai terpublikasi milik praktikan di semester ini.
        $grades = Grade::where('status', 'published')
            ->whereHas('submission', fn ($q) => $q->where('user_id', $user->id)->where('is_current', true)
                ->whereIn('task_target_id', TaskTarget::whereIn('class_id', $classes->pluck('id'))->select('id')))
            ->with(['submission.target.task', 'grader'])
            ->get();

        $cards = $classes->map(function (LabClass $class) use ($grades) {
            $mine = $grades->filter(fn (Grade $g) => $g->submission->target->class_id === $class->id);
            $final = FinalScore::compute($class->course, $mine);

            return [
                'classId' => $class->id,
                'course' => $class->course->name,
                'className' => $class->name,
                'dayOfWeek' => $class->day_of_week,
                'startTime' => $class->startClock(),
                'endTime' => $class->endClock(),
                'assistants' => $class->assistants->pluck('name')->join(', '),
                'final' => $final['final'],
                'letter' => $final['letter'],
            ];
        })->values();

        $selected = $classes->firstWhere('id', $request->integer('class')) ?? $classes->first();

        return Inertia::render('praktikan/grades', [
            'courses' => $cards,
            'detail' => $selected ? $this->detail($selected, $user->id, $grades) : null,
        ]);
    }

    /**
     * @param  Collection<int, Grade>  $grades
     * @return array<string, mixed>
     */
    private function detail(LabClass $class, int $userId, $grades): array
    {
        $mine = $grades->filter(fn (Grade $g) => $g->submission->target->class_id === $class->id);
        $final = FinalScore::compute($class->course, $mine);

        $targets = TaskTarget::where('class_id', $class->id)
            ->whereNotNull('open_at')->where('open_at', '<=', now())
            ->whereHas('task', fn ($q) => $q->where('status', 'published'))
            ->with('task')->get();
        $submissions = Submission::whereIn('task_target_id', $targets->pluck('id'))->where('user_id', $userId)
            ->where('is_current', true)->with(['grade.grader'])->get()->keyBy('task_target_id');

        $cell = function (?TaskTarget $target) use ($submissions) {
            if (! $target) {
                return null;
            }

            $submission = $submissions->get($target->id);
            $grade = $submission?->grade;
            $published = $grade?->isPublished();

            return [
                'taskTitle' => $target->task->title,
                'maxScore' => $target->task->max_score,
                // US-P03-1/3: angka hanya bila sudah dipublikasikan.
                'score' => $published ? (float) $grade->score : null,
                'status' => $published ? 'graded' : ($submission ? 'awaiting_grade' : ($target->state() === 'closed' ? 'not_submitted' : 'open')),
                'feedback' => $published ? $grade->feedback : null,
                'grader' => $published ? $grade->grader?->name : null,
                'gradedAt' => $published ? $grade->published_at?->toIso8601String() : null,
                'isLate' => $submission->is_late ?? false,
            ];
        };

        $byMeeting = $targets->groupBy(fn (TaskTarget $t) => $t->task->meeting_number ?? 0);

        $rows = $class->meetings->map(function (Meeting $meeting) use ($byMeeting, $cell) {
            $group = $byMeeting->get($meeting->number, collect());

            return [
                'meeting' => $meeting->number,
                'title' => $meeting->topic,
                'date' => $meeting->date->toDateString(),
                'pretest' => $cell($group->first(fn ($t) => $t->task->type->value === 'pretest')),
                'posttest' => $cell($group->first(fn ($t) => $t->task->type->value === 'posttest')),
                'report' => $cell($group->first(fn ($t) => $t->task->type->value === 'report')),
            ];
        })->filter(fn ($row) => $row['pretest'] || $row['posttest'] || $row['report'])->values();

        $meetingIds = $class->meetings->filter->hasStarted()->pluck('id');
        $present = Attendance::whereIn('meeting_id', $meetingIds)->where('user_id', $userId)->where('status', 'hadir')->count();

        return [
            'classId' => $class->id,
            'course' => $class->course->name,
            'className' => $class->name,
            'weights' => ['pretest' => $class->course->weight_pretest, 'posttest' => $class->course->weight_posttest, 'report' => $class->course->weight_report],
            'final' => $final,
            'attendance' => ['present' => $present, 'total' => $meetingIds->count()],
            'rows' => $rows,
            'others' => $byMeeting->get(0, collect())->map(fn (TaskTarget $t) => $cell($t))->values(),
        ];
    }
}
