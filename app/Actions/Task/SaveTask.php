<?php

namespace App\Actions\Task;

use App\Enums\TaskType;
use App\Http\Requests\Asisten\TaskRequest;
use App\Models\AuditLog;
use App\Models\Meeting;
use App\Models\Task;
use App\Models\TaskTarget;
use App\Support\Files\FileStore;
use App\Support\Notifications\Notify;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * FR-AT-01…05: simpan tugas (Draft/Terbit), sinkron target kelas, lampiran.
 */
class SaveTask
{
    public function __construct(private readonly FileStore $files) {}

    public function __invoke(TaskRequest $request, ?Task $task = null): Task
    {
        $data = $request->validated();
        $course = $request->course();
        $publishing = $data['intent'] === 'publish';

        return DB::transaction(function () use ($request, $data, $course, $task, $publishing) {
            $task ??= new Task([
                'course_id' => $course->id,
                'semester_id' => $course->semester_id,
                'type' => TaskType::from($data['type']),
                'created_by' => $request->user()->id,
            ]);

            $task->fill([
                'title' => $data['title'],
                'topic' => $data['topic'] ?? null,
                'body_json' => $data['body_json'] ?? null,
                'meeting_number' => $data['meeting_number'] ?? null,
                'max_score' => $data['max_score'],
                'allow_late' => $data['allow_late'] ?? false,
                'late_penalty' => ($data['allow_late'] ?? false) ? ($data['late_penalty'] ?? null) : null,
                'late_penalty_unit' => ($data['allow_late'] ?? false) && isset($data['late_penalty']) ? $data['late_penalty_unit'] : null,
                'allowed_formats' => $data['allowed_formats'] ?? [],
                'text_answer' => $data['text_answer'],
            ]);

            // Tugas terbit tidak kembali ke Draft hanya karena disimpan ulang.
            if ($publishing) {
                $task->status = 'published';
            } elseif (! $task->exists) {
                $task->status = 'draft';
            }

            $task->save();
            $this->syncTargets($task, collect($data['targets'] ?? []));
            $this->syncAttachments($request, $task);

            AuditLog::record($publishing ? 'task.published' : 'task.saved', $task, null, ['title' => $task->title, 'targets' => count($data['targets'] ?? [])]);

            return $task;
        });
    }

    /**
     * @param  Collection<int, array<string, mixed>>  $targets
     */
    private function syncTargets(Task $task, $targets): void
    {
        $classIds = $targets->pluck('class_id')->map(fn ($id) => (int) $id)->all();

        // Target yang sudah punya submission tidak boleh dihapus.
        $removing = $task->targets()->whereNotIn('class_id', $classIds)->withCount('submissions')->get();
        if ($removing->contains(fn (TaskTarget $target) => $target->submissions_count > 0)) {
            throw ValidationException::withMessages(['targets' => 'Kelas yang sudah memiliki submission tidak dapat dihapus dari tugas.']);
        }
        $removing->each->delete();

        foreach ($targets as $target) {
            $classId = (int) $target['class_id'];
            $meetingId = $task->meeting_number
                ? Meeting::where('class_id', $classId)->where('number', $task->meeting_number)->value('id')
                : null;

            $record = TaskTarget::firstOrNew(['task_id' => $task->id, 'class_id' => $classId]);
            $record->fill([
                'meeting_id' => $meetingId,
                'open_at' => $target['open_at'] ?? null,
                'due_at' => $target['due_at'] ?? null,
                'window_minutes' => $task->type === TaskType::Pretest ? ($target['window_minutes'] ?? null) : null,
            ]);

            $announce = $task->isPublished() && $record->published_at === null;
            if ($announce) {
                $record->published_at = now();
            }

            $record->save();

            if ($announce) {
                $class = $record->labClass()->with('course')->first();
                Notify::send(
                    $class->enrollments()->pluck('user_id')->all(),
                    'task',
                    "Tugas baru: {$task->title}",
                    "{$class->course->name} · {$class->name}".($record->due_at ? ' — tenggat '.$record->due_at->locale('id')->translatedFormat('d M Y H:i') : ''),
                    '/praktikan/tasks/'.$record->id,
                );
            }
        }
    }

    private function syncAttachments(TaskRequest $request, Task $task): void
    {
        $task->attachments()->whereIn('id', (array) $request->input('remove_attachments', []))->get()->each->delete();

        foreach ((array) $request->file('attachments', []) as $index => $upload) {
            $this->files->store($upload, ['pdf', 'zip', 'image'], 'task_attachment', $task, $request->user(), "attachments.{$index}", (int) config('lab.files.attachment_max'));
        }
    }
}
