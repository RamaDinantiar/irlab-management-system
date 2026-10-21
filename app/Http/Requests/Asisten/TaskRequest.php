<?php

namespace App\Http\Requests\Asisten;

use App\Enums\ApprovalStatus;
use App\Enums\TaskType;
use App\Models\Course;
use App\Models\LabClass;
use App\Models\Task;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * FR-AT-01…04: buat/ubah tugas — jenis, soal, lampiran, pengaturan, target
 * multi-kelas dengan tenggat per kelas. `intent=publish` menerbitkan.
 */
class TaskRequest extends FormRequest
{
    public function course(): ?Course
    {
        $task = $this->route('task');

        return $task instanceof Task ? $task->course : Course::find($this->integer('course_id'));
    }

    public function authorize(): bool
    {
        $task = $this->route('task');
        $course = $this->course();

        if ($task instanceof Task) {
            return $task->isManagedBy($this->user()) && $task->isEditable();
        }

        // Course tidak valid → biarkan validasi yang melaporkan.
        return $course === null
            || ($course->semester->isEditable() && ($this->user()->isAdmin() || $course->assistants()->whereKey($this->user()->id)->exists()));
    }

    protected function prepareForValidation(): void
    {
        $body = $this->input('body');

        $this->merge([
            'body_json' => is_string($body) && $body !== '' ? json_decode($body, true) : null,
            'allow_late' => $this->boolean('allow_late'),
            'allowed_formats' => array_values(array_filter((array) $this->input('allowed_formats', []))),
        ]);
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $task = $this->route('task');

        return [
            ...($task instanceof Task ? [] : [
                'course_id' => ['required', 'integer', Rule::exists('courses', 'id')->where('approval_status', ApprovalStatus::Approved->value)],
                'type' => ['required', Rule::enum(TaskType::class)],
            ]),
            'intent' => ['required', 'in:draft,publish'],
            'title' => ['required', 'string', 'max:150'],
            'topic' => ['nullable', 'string', 'max:255'],
            'body_json' => ['nullable', 'array'],
            'meeting_number' => ['nullable', 'integer', 'between:1,50'],
            'max_score' => ['required', 'integer', 'between:1,1000'],
            'allow_late' => ['boolean'],
            'late_penalty' => ['nullable', 'numeric', 'between:0,100'],
            'late_penalty_unit' => ['nullable', 'required_with:late_penalty', 'in:hour,day'],
            'allowed_formats' => ['array'],
            'allowed_formats.*' => ['in:pdf,zip'],
            'text_answer' => ['required', 'in:none,optional,required'],
            'targets' => ['array'],
            'targets.*.class_id' => ['required', 'integer', 'distinct'],
            'targets.*.open_at' => ['nullable', 'date'],
            'targets.*.due_at' => ['nullable', 'date'],
            'targets.*.window_minutes' => ['nullable', 'integer', 'between:5,240'],
            'attachments' => ['array'],
            'attachments.*' => ['file'],
            'remove_attachments' => ['array'],
            'remove_attachments.*' => ['integer'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $course = $this->course();
            $task = $this->route('task');
            $type = $task instanceof Task ? $task->type : TaskType::from($this->input('type'));
            $publishing = $this->input('intent') === 'publish';

            // Body JSON maksimal 200 KB agar database & render tetap ringan.
            if (strlen((string) json_encode($this->input('body_json'))) > 200 * 1024) {
                $validator->errors()->add('body', 'Isi soal terlalu panjang (maks. 200 KB). Pindahkan materi panjang ke lampiran.');
            }

            if ($this->input('allowed_formats') === [] && $this->input('text_answer') === 'none') {
                $validator->errors()->add('allowed_formats', 'Pilih minimal satu cara menjawab: unggah file atau jawaban teks.');
            }

            $existing = $task instanceof Task ? $task->attachments()->whereNotIn('id', (array) $this->input('remove_attachments', []))->count() : 0;
            if ($existing + count((array) $this->file('attachments', [])) > config('lab.files.attachment_count')) {
                $validator->errors()->add('attachments', 'Maksimal '.config('lab.files.attachment_count').' lampiran.');
            }

            $targets = $this->collect('targets');

            if ($publishing && $targets->isEmpty()) {
                $validator->errors()->add('targets', 'Pilih minimal satu kelas sebelum menerbitkan.');
            }

            $allowed = LabClass::where('course_id', $course->id)
                ->where('approval_status', ApprovalStatus::Approved)
                ->taughtBy($this->user())
                ->pluck('id')->all();

            foreach ($targets as $index => $target) {
                if (! in_array((int) $target['class_id'], $allowed, true)) {
                    $validator->errors()->add("targets.{$index}.class_id", 'Kelas tidak termasuk mata kuliah ini atau tidak Anda ampu.');

                    continue;
                }

                $opensWithSession = $type === TaskType::Pretest && ! empty($target['window_minutes']) && empty($target['open_at']);

                if ($opensWithSession && ! $this->input('meeting_number')) {
                    $validator->errors()->add('meeting_number', 'Pre-test yang dibuka saat sesi dimulai harus terhubung ke pertemuan.');
                }

                if ($publishing && ! $opensWithSession && (empty($target['open_at']) || empty($target['due_at']))) {
                    $validator->errors()->add("targets.{$index}.due_at", 'Isi waktu buka dan tenggat untuk setiap kelas.');
                }

                if (! empty($target['open_at']) && ! empty($target['due_at']) && strtotime($target['due_at']) <= strtotime($target['open_at'])) {
                    $validator->errors()->add("targets.{$index}.due_at", 'Tenggat harus setelah waktu buka.');
                }
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'course_id' => 'mata kuliah', 'type' => 'jenis tugas', 'title' => 'judul', 'topic' => 'topik', 'max_score' => 'nilai maksimal',
            'late_penalty' => 'penalti', 'late_penalty_unit' => 'satuan penalti', 'text_answer' => 'jawaban teks',
            'meeting_number' => 'pertemuan', 'attachments.*' => 'lampiran',
        ];
    }
}
