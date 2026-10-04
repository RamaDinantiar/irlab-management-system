<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\Task\SaveTask;
use App\Enums\ApprovalStatus;
use App\Enums\TaskType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Asisten\TaskRequest;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\StoredFile;
use App\Models\Task;
use App\Models\TaskTarget;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Asisten (& Admin) › Task Management (FR-AT).
 */
class TaskController extends Controller
{
    public function index(Request $request, ?string $type = null): Response
    {
        $semester = Semester::current();
        $taskType = TaskType::fromSlug($type);
        $user = $request->user();

        $tasks = $semester
            ? Task::where('semester_id', $semester->id)
                ->when($taskType, fn ($q) => $q->where('type', $taskType))
                ->when(! $user->isAdmin(), fn ($q) => $q->whereHas('course.assistants', fn ($a) => $a->whereKey($user->id)))
                ->with(['course', 'targets.labClass' => fn ($q) => $q->withCount('enrollments'), 'targets' => fn ($q) => $q->withCount(['submissions' => fn ($s) => $s->where('is_current', true)])])
                ->latest()
                ->get()
            : collect();

        return Inertia::render('asisten/tasks/index', [
            'type' => $taskType?->value,
            'tasks' => $tasks->map(fn (Task $task) => [
                'id' => $task->id,
                'type' => $task->type->value,
                'title' => $task->title,
                'course' => "{$task->course->code} · {$task->course->name}",
                'status' => $task->status,
                'meetingNumber' => $task->meeting_number,
                'canEdit' => $task->isEditable(),
                'targets' => $task->targets->map(fn (TaskTarget $target) => [
                    'id' => $target->id,
                    'className' => $target->labClass->name,
                    'state' => $target->setRelation('task', $task)->state(),
                    'openAt' => $target->open_at?->toIso8601String(),
                    'dueAt' => $target->due_at?->toIso8601String(),
                    'windowMinutes' => $target->window_minutes,
                    'submitted' => $target->submissions_count,
                    'members' => $target->labClass->enrollments_count,
                ])->values(),
            ]),
        ]);
    }

    public function create(Request $request): Response
    {
        $type = TaskType::tryFrom((string) $request->query('type')) ?? TaskType::Posttest;

        return Inertia::render('asisten/tasks/form', [
            'task' => null,
            'defaultType' => $type->value,
            ...$this->options($request),
        ]);
    }

    public function store(TaskRequest $request, SaveTask $save): RedirectResponse
    {
        $task = $save($request);

        Inertia::flash('toast', ['type' => 'success', 'message' => $task->isPublished() ? "“{$task->title}” diterbitkan." : "“{$task->title}” disimpan sebagai Draft."]);

        return to_route('asisten.tasks.index', ['type' => $task->type->slug()]);
    }

    public function edit(Request $request, Task $task): Response
    {
        abort_unless($task->isManagedBy($request->user()), 403);
        $task->load(['targets', 'attachments', 'course']);

        return Inertia::render('asisten/tasks/form', [
            'task' => [
                'id' => $task->id,
                'type' => $task->type->value,
                'courseId' => $task->course_id,
                'title' => $task->title,
                'body' => $task->body_json,
                'meetingNumber' => $task->meeting_number,
                'maxScore' => $task->max_score,
                'allowLate' => $task->allow_late,
                'latePenalty' => $task->late_penalty !== null ? (float) $task->late_penalty : null,
                'latePenaltyUnit' => $task->late_penalty_unit,
                'allowedFormats' => $task->allowed_formats,
                'textAnswer' => $task->text_answer,
                'status' => $task->status,
                'canEdit' => $task->isEditable(),
                'attachments' => $task->attachments->map(fn (StoredFile $file) => $file->toClient()),
                'targets' => $task->targets->map(fn (TaskTarget $target) => [
                    'classId' => $target->class_id,
                    'openAt' => $target->open_at?->toIso8601String(),
                    'dueAt' => $target->due_at?->toIso8601String(),
                    'windowMinutes' => $target->window_minutes,
                ])->values(),
            ],
            'defaultType' => $task->type->value,
            ...$this->options($request, $task->semester_id),
        ]);
    }

    public function update(TaskRequest $request, Task $task, SaveTask $save): RedirectResponse
    {
        $save($request, $task);

        Inertia::flash('toast', ['type' => 'success', 'message' => "“{$task->title}” disimpan."]);

        return to_route('asisten.tasks.index', ['type' => $task->type->slug()]);
    }

    /**
     * FR-AT-06: duplikasi tugas (soal & pengaturan) sebagai Draft tanpa target.
     */
    public function duplicate(Request $request, Task $task): RedirectResponse
    {
        abort_unless($task->isManagedBy($request->user()), 403);

        $copy = DB::transaction(function () use ($task, $request) {
            $copy = $task->replicate(['status']);
            $copy->fill(['title' => "{$task->title} (salinan)", 'status' => 'draft', 'created_by' => $request->user()->id]);
            $copy->semester_id = Semester::current()?->id ?? $task->semester_id;
            $copy->save();

            AuditLog::record('task.duplicated', $copy, null, ['source_task_id' => $task->id]);

            return $copy;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tugas diduplikasi sebagai Draft. Atur kelas & tenggatnya.']);

        return to_route('asisten.tasks.edit', $copy);
    }

    public function destroy(Request $request, Task $task): RedirectResponse
    {
        abort_unless($task->isManagedBy($request->user()) && $task->isEditable(), 403);
        abort_if($task->targets()->whereHas('submissions')->exists(), 422, 'Tugas yang sudah memiliki submission tidak dapat dihapus.');

        AuditLog::record('task.deleted', $task, ['title' => $task->title]);
        $task->attachments->each->delete();
        $task->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tugas dihapus.']);

        return to_route('asisten.tasks.index');
    }

    /**
     * Mata kuliah yang diampu + kelasnya (untuk form).
     *
     * @return array<string, mixed>
     */
    private function options(Request $request, ?int $semesterId = null): array
    {
        $user = $request->user();
        $semesterId ??= Semester::current()?->id;

        $courses = Course::where('semester_id', $semesterId)
            ->where('approval_status', ApprovalStatus::Approved)
            ->when(! $user->isAdmin(), fn ($q) => $q->whereHas('assistants', fn ($a) => $a->whereKey($user->id)))
            ->with(['classes' => fn ($q) => $q->where('approval_status', ApprovalStatus::Approved)->taughtBy($user)->orderBy('name')])
            ->orderBy('code')
            ->get();

        return [
            'courses' => $courses->map(fn (Course $course) => [
                'id' => $course->id,
                'label' => "{$course->code} · {$course->name}",
                'classes' => $course->classes->map(fn (LabClass $class) => [
                    'id' => $class->id,
                    'label' => $class->name,
                    'dayOfWeek' => $class->day_of_week,
                    'startTime' => $class->startClock(),
                    'endTime' => $class->endClock(),
                ])->values(),
            ]),
            'limits' => [
                'attachments' => (int) config('lab.files.attachment_count'),
                'attachmentMb' => (int) config('lab.files.attachment_max') / 1024,
            ],
        ];
    }
}
