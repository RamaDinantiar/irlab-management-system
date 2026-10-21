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
        return Inertia::render('asisten/tasks/index', $this->indexProps($request, TaskType::fromSlug($type)));
    }

    /**
     * "Buat Tugas" kini pop-up di halaman daftar; URL lama tetap membuka pop-up itu.
     */
    public function create(Request $request): Response
    {
        $type = TaskType::tryFrom((string) $request->query('type'));

        return Inertia::render('asisten/tasks/index', [
            ...$this->indexProps($request, $type),
            'openCreate' => true,
            // Pintasan dari panel "Sesi Berlangsung": kelas langsung dipilih.
            'createClassId' => $request->integer('class') ?: null,
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

        return Inertia::render('asisten/tasks/index', [
            ...$this->indexProps($request, $task->type, $task->semester_id),
            'editing' => [
                'id' => $task->id,
                'type' => $task->type->value,
                'courseId' => $task->course_id,
                'title' => $task->title,
                'topic' => $task->topic,
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
            $copy->semester_id = Semester::current()->id ?? $task->semester_id;
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
     * Daftar tugas per kelas (kartu Figma) + opsi pop-up Buat/Ubah Tugas.
     *
     * @return array<string, mixed>
     */
    private function indexProps(Request $request, ?TaskType $taskType, ?int $semesterId = null): array
    {
        $semesterId ??= Semester::current()?->id;
        $user = $request->user();

        $tasks = $semesterId
            ? Task::where('semester_id', $semesterId)
                ->when($taskType, fn ($q) => $q->where('type', $taskType))
                ->when(! $user->isAdmin(), fn ($q) => $q->whereHas('course.assistants', fn ($a) => $a->whereKey($user->id)))
                ->with([
                    'course',
                    'targets.labClass' => fn ($q) => $q->withCount('enrollments'),
                    'targets' => fn ($q) => $q->withCount([
                        'submissions' => fn ($s) => $s->where('is_current', true),
                        'submissions as graded_count' => fn ($s) => $s->where('is_current', true)->whereHas('grade', fn ($g) => $g->whereNotNull('score')),
                    ]),
                ])
                ->latest()
                ->get()
            : collect();

        return [
            'type' => $taskType?->value,
            'tasks' => $tasks->map(fn (Task $task) => [
                'id' => $task->id,
                'type' => $task->type->value,
                'title' => $task->title,
                'topic' => $task->topic,
                'courseId' => $task->course_id,
                'course' => "{$task->course->code} · {$task->course->name}",
                'courseName' => $task->course->name,
                'status' => $task->status,
                'meetingNumber' => $task->meeting_number,
                'allowLate' => $task->allow_late,
                'canEdit' => $task->isEditable(),
                'targets' => $task->targets->sortBy(fn (TaskTarget $target) => $target->labClass->name)->map(fn (TaskTarget $target) => [
                    'id' => $target->id,
                    'classId' => $target->class_id,
                    'className' => $target->labClass->name,
                    'dayOfWeek' => $target->labClass->day_of_week,
                    'startTime' => $target->labClass->startClock(),
                    'endTime' => $target->labClass->endClock(),
                    'state' => $target->setRelation('task', $task)->state(),
                    'openAt' => $target->open_at?->toIso8601String(),
                    'dueAt' => $target->due_at?->toIso8601String(),
                    'closedAt' => $target->closed_at?->toIso8601String(),
                    'windowMinutes' => $target->window_minutes,
                    'submitted' => $target->submissions_count,
                    'graded' => $target->graded_count,
                    'members' => $target->labClass->enrollments_count,
                ])->values(),
            ]),
            'extendOptions' => TaskTargetController::EXTEND_OPTIONS,
            'openCreate' => false,
            'editing' => null,
            ...$this->options($request, $semesterId),
        ];
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
            ->with(['classes' => fn ($q) => $q->where('approval_status', ApprovalStatus::Approved)->taughtBy($user)->withCount('enrollments')->orderBy('name')
                // Sesi yang sedang berjalan → Post/Pre-Test cukup jam mulai & selesai.
                ->with(['meetings' => fn ($m) => $m->running()->orderByDesc('date')])])
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
                    'members' => $class->enrollments_count,
                    'session' => ($meeting = $class->meetings->first()) ? [
                        'meetingNumber' => $meeting->number,
                        'startedAt' => ($meeting->started_at ?? $meeting->startsAt())->toIso8601String(),
                    ] : null,
                ])->values(),
            ]),
            'limits' => [
                'attachments' => (int) config('lab.files.attachment_count'),
                'attachmentMb' => (int) config('lab.files.attachment_max') / 1024,
            ],
        ];
    }
}
