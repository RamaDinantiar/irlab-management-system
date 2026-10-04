<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\Grade\PublishGrades;
use App\Actions\Grade\SaveGradesBatch;
use App\Enums\ApprovalStatus;
use App\Enums\TaskType;
use App\Http\Controllers\Asisten\Concerns\AuthorizesClassAssistant;
use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\Submission;
use App\Models\TaskTarget;
use App\Support\Files\ZipBrowser;
use App\Support\Grading\FinalScore;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Asisten (& Admin) › Grade (FR-AG, US-A02).
 */
class GradeController extends Controller
{
    use AuthorizesClassAssistant;

    public function index(Request $request, ?string $type = null): Response
    {
        $taskType = TaskType::fromSlug($type);
        $user = $request->user();
        $semester = Semester::current();

        $classes = $semester
            ? LabClass::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)->taughtBy($user)
                ->with('course')->orderBy('course_id')->orderBy('name')->get()
            : collect();

        $class = $classes->firstWhere('id', $request->integer('class')) ?? $classes->first();

        $targets = $class
            ? TaskTarget::where('class_id', $class->id)
                ->whereNotNull('open_at')
                ->whereHas('task', fn ($q) => $q->where('status', 'published')->when($taskType, fn ($t) => $t->where('type', $taskType)))
                ->with('task')
                ->withCount([
                    'submissions as submitted_count' => fn ($q) => $q->where('is_current', true),
                    'submissions as graded_count' => fn ($q) => $q->where('is_current', true)->whereHas('grade', fn ($g) => $g->whereNotNull('score')),
                ])
                ->orderByDesc('due_at')
                ->get()
            : collect();

        $target = $targets->firstWhere('id', $request->integer('target'))
            ?? $targets->sortByDesc(fn (TaskTarget $t) => $t->submitted_count - $t->graded_count)->first();

        return Inertia::render('asisten/grades/index', [
            'type' => $taskType?->value,
            'classes' => $classes->map(fn (LabClass $c) => ['id' => $c->id, 'label' => "{$c->course->name} · {$c->name}"])->values(),
            'targets' => $targets->map(fn (TaskTarget $t) => [
                'id' => $t->id,
                'label' => $t->task->title,
                'type' => $t->task->type->value,
                'submitted' => $t->submitted_count,
                'graded' => $t->graded_count,
            ])->values(),
            'selected' => ['classId' => $class?->id, 'targetId' => $target?->id],
            'target' => $target ? $this->targetSummary($target->setRelation('labClass', $class)) : null,
            'rows' => $target ? $this->rows($target) : [],
        ]);
    }

    public function batch(Request $request, SaveGradesBatch $save): RedirectResponse
    {
        $validated = $request->validate([
            'target_id' => ['required', 'integer', 'exists:task_targets,id'],
            'grades' => ['required', 'array', 'min:1', 'max:500'],
            'grades.*.submission_id' => ['required', 'integer'],
            'grades.*.score' => ['nullable'],
            'grades.*.feedback' => ['nullable', 'string'],
            'grades.*.version' => ['nullable', 'integer'],
        ]);

        $target = TaskTarget::with(['task', 'labClass'])->findOrFail($validated['target_id']);
        $this->authorizeAssistant($request, $target->labClass, write: true);

        $count = $save($request->user(), $target, $validated['grades']);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$count} nilai disimpan sebagai Draft. Publikasikan agar terlihat praktikan."]);

        return back();
    }

    public function publish(Request $request, TaskTarget $target, PublishGrades $publish): RedirectResponse
    {
        $this->authorizeAssistant($request, $target->labClass, write: true);
        $count = $publish($target);

        Inertia::flash('toast', [
            'type' => $count > 0 ? 'success' : 'info',
            'message' => $count > 0 ? "{$count} nilai dipublikasikan. Praktikan mendapat notifikasi." : 'Tidak ada nilai Draft yang perlu dipublikasikan.',
        ]);

        return back();
    }

    /**
     * FR-AG-04: Split-Screen 70:30 — dokumen di kiri, nilai di kanan.
     */
    public function review(Request $request, TaskTarget $target): Response
    {
        $target->load(['task', 'labClass']);
        $this->authorizeAssistant($request, $target->labClass);

        $rows = collect($this->rows($target))->filter(fn ($row) => $row['submission'] !== null)->values();
        $current = $rows->firstWhere('userId', $request->integer('student')) ?? $rows->first();
        $index = $current ? $rows->search(fn ($row) => $row['userId'] === $current['userId']) : null;

        $zip = null;
        if ($current && ($current['submission']['file']['mime'] ?? null) === 'application/zip') {
            $submission = Submission::with('file')->find($current['submission']['id']);
            $zip = ZipBrowser::entries($submission->file);
        }

        return Inertia::render('asisten/grades/review', [
            'target' => $this->targetSummary($target),
            'students' => $rows->map(fn ($row) => ['userId' => $row['userId'], 'name' => $row['name'], 'nim' => $row['nim'], 'graded' => $row['grade']['score'] ?? null])->values(),
            'current' => $current,
            'position' => $index === null ? null : ['index' => $index, 'total' => $rows->count(), 'prev' => $rows[$index - 1]['userId'] ?? null, 'next' => $rows[$index + 1]['userId'] ?? null],
            'zipEntries' => $zip,
        ]);
    }

    /**
     * Isi satu file dari ZIP submission (Code Viewer).
     */
    public function zipFile(Request $request, Submission $submission): JsonResponse
    {
        $submission->load(['target.labClass', 'file']);
        $this->authorizeAssistant($request, $submission->target->labClass);
        abort_unless($submission->file?->mime === 'application/zip', 404);

        return response()->json(ZipBrowser::read($submission->file, (string) $request->query('path')));
    }

    /**
     * FR-AG-06: rekap nilai kelas (per komponen + nilai akhir berbobot) ke Excel.
     */
    public function export(Request $request, LabClass $class): StreamedResponse
    {
        $this->authorizeAssistant($request, $class);
        $class->load('course');

        $targets = TaskTarget::where('class_id', $class->id)->whereHas('task', fn ($q) => $q->where('status', 'published'))
            ->with('task')->get()->sortBy(fn (TaskTarget $t) => [$t->task->meeting_number ?? 99, $t->task->type->value])->values();

        $grades = Grade::where('status', 'published')
            ->whereHas('submission', fn ($q) => $q->whereIn('task_target_id', $targets->pluck('id'))->where('is_current', true))
            ->with('submission.target.task')
            ->get()
            ->groupBy('submission.user_id');

        $members = $class->enrollments()->with('user:id,nim,name')->get()->sortBy(fn (Enrollment $e) => $e->user->nim);
        $filename = str($class->course->code.'-'.$class->name.'-rekap-nilai')->slug().'.xlsx';

        return response()->streamDownload(function () use ($targets, $grades, $members, $class) {
            $writer = new Writer;
            $writer->openToFile('php://output');
            $writer->addRow(Row::fromValues([
                'NIM', 'Nama',
                ...$targets->map(fn (TaskTarget $t) => $t->task->title)->all(),
                'Rata-rata Pre-test', 'Rata-rata Post-test', 'Rata-rata Laporan', 'Nilai Akhir', 'Huruf',
            ]));

            foreach ($members as $enrollment) {
                $mine = $grades->get($enrollment->user_id, collect());
                $byTarget = $mine->keyBy(fn (Grade $g) => $g->submission->task_target_id);
                $final = FinalScore::compute($class->course, $mine);

                $writer->addRow(Row::fromValues([
                    $enrollment->user->nim, $enrollment->user->name,
                    ...$targets->map(fn (TaskTarget $t) => isset($byTarget[$t->id]) ? (float) $byTarget[$t->id]->score : null)->all(),
                    $final['pretest'], $final['posttest'], $final['report'], $final['final'], $final['letter'],
                ]));
            }

            $writer->close();
        }, $filename, ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    /**
     * @return array<string, mixed>
     */
    private function targetSummary(TaskTarget $target): array
    {
        $current = Submission::where('task_target_id', $target->id)->where('is_current', true);

        return [
            'id' => $target->id,
            'classId' => $target->class_id,
            'className' => $target->labClass->name,
            'title' => $target->task->title,
            'type' => $target->task->type->value,
            'maxScore' => $target->task->max_score,
            'dueAt' => $target->due_at?->toIso8601String(),
            'submitted' => (clone $current)->count(),
            'graded' => (clone $current)->whereHas('grade', fn ($q) => $q->whereNotNull('score'))->count(),
            'drafts' => (clone $current)->whereHas('grade', fn ($q) => $q->where('status', 'draft')->whereNotNull('score'))->count(),
            'members' => $target->labClass->enrollments()->count(),
            'canEdit' => $target->labClass->isEditable(),
        ];
    }

    /**
     * Semua anggota kelas + submission terkini & nilainya (US-A02-1).
     *
     * @return list<array<string, mixed>>
     */
    private function rows(TaskTarget $target): array
    {
        $submissions = Submission::where('task_target_id', $target->id)->where('is_current', true)
            ->with(['file', 'grade.grader'])->get()->keyBy('user_id');

        /** @var Collection<int, Enrollment> $members */
        $members = $target->labClass->enrollments()->with('user:id,nim,name')->get()
            ->sortBy(fn (Enrollment $e) => $e->user->nim)->values();

        return $members->map(function (Enrollment $enrollment) use ($submissions) {
            $submission = $submissions->get($enrollment->user_id);
            $grade = $submission?->grade;

            return [
                'userId' => $enrollment->user_id,
                'nim' => $enrollment->user->nim,
                'name' => $enrollment->user->name,
                'submission' => $submission ? [
                    'id' => $submission->id,
                    'submittedAt' => $submission->submitted_at->toIso8601String(),
                    'isLate' => $submission->is_late,
                    'lateLabel' => $submission->lateLabel(),
                    'version' => $submission->version,
                    'textAnswer' => $submission->text_answer,
                    'file' => $submission->file?->toClient(inline: true),
                ] : null,
                'grade' => $grade ? [
                    'score' => $grade->score !== null ? (float) $grade->score : null,
                    'feedback' => $grade->feedback,
                    'status' => $grade->status,
                    'version' => $grade->version,
                    'grader' => $grade->grader?->name,
                ] : null,
            ];
        })->all();
    }
}
