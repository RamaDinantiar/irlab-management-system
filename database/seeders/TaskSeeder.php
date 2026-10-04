<?php

namespace Database\Seeders;

use App\Enums\TaskType;
use App\Models\Course;
use App\Models\Grade;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Semester;
use App\Models\Submission;
use App\Models\Task;
use App\Models\TaskTarget;
use App\Support\Files\FileStore;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;

/**
 * Tugas contoh per mata kuliah aktif + submission praktikan (untuk Grade).
 */
class TaskSeeder extends Seeder
{
    private const PDF = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";

    public function run(FileStore $files): void
    {
        $semester = Semester::current();

        Course::where('semester_id', $semester->id)->where('approval_status', 'approved')->with(['classes.enrollments', 'assistants'])->get()
            ->each(function (Course $course) use ($files) {
                $creator = $course->assistants->first();
                $body = fn (string $text, string $code) => ['type' => 'doc', 'content' => [
                    ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]],
                    ['type' => 'codeBlock', 'attrs' => ['language' => 'python'], 'content' => [['type' => 'text', 'text' => $code]]],
                ]];

                $tasks = [
                    // [jenis, judul, pertemuan, buka (hari), tenggat (hari), boleh terlambat, format, kirim?]
                    [TaskType::Pretest, 'Pre-Test Modul 07', 7, null, null, false, ['pdf'], false],
                    [TaskType::Posttest, 'Post-Test Modul 06', 6, -6, 1, false, ['pdf', 'zip'], 0.4],
                    [TaskType::Report, 'Laporan Modul 05', 5, -10, -3, true, ['pdf'], 0.85],
                    [TaskType::Posttest, 'Post-Test Modul 05', 5, -12, -5, false, ['pdf'], 0.9],
                ];

                foreach ($tasks as [$type, $title, $meetingNumber, $open, $due, $allowLate, $formats, $submitRate]) {
                    $task = Task::create([
                        'semester_id' => $course->semester_id,
                        'course_id' => $course->id,
                        'type' => $type,
                        'title' => "{$title} · {$course->name}",
                        'body_json' => $body("Jelaskan konsep pada modul ini dan implementasikan fungsi berikut untuk {$course->name}.", "def evaluate(model, data):\n    # TODO: lengkapi\n    return model.score(data)"),
                        'max_score' => 100,
                        'allow_late' => $allowLate,
                        'late_penalty' => $allowLate ? 5 : null,
                        'late_penalty_unit' => $allowLate ? 'day' : null,
                        'allowed_formats' => $formats,
                        'text_answer' => 'optional',
                        'status' => 'published',
                        'meeting_number' => $meetingNumber,
                        'created_by' => $creator?->id,
                    ]);

                    $course->classes->where('approval_status', 'approved')->each(function (LabClass $class) use ($task, $meetingNumber, $open, $due, $submitRate, $files) {
                        $target = TaskTarget::create([
                            'task_id' => $task->id,
                            'class_id' => $class->id,
                            'meeting_id' => Meeting::where('class_id', $class->id)->where('number', $meetingNumber)->value('id'),
                            'open_at' => $open !== null ? now()->addDays($open)->setTime(8, 0) : null,
                            'due_at' => $due !== null ? now()->addDays($due)->setTime(23, 59) : null,
                            'window_minutes' => $open === null ? 15 : null,
                            'published_at' => now()->subDays(12),
                        ]);

                        if (! $submitRate) {
                            return;
                        }

                        foreach ($class->enrollments->values() as $i => $enrollment) {
                            if (($i * 37 % 100) / 100 >= $submitRate) {
                                continue;
                            }

                            $late = $task->allow_late && $i % 6 === 0;
                            $submittedAt = $late ? $target->due_at->addHours(3 + $i % 20) : $target->open_at->addHours(2 + $i % 40);
                            $submission = Submission::create([
                                'task_target_id' => $target->id,
                                'user_id' => $enrollment->user_id,
                                'text_answer' => "Jawaban singkat praktikan.\n\n```python\nprint(\"versi {$i}\")\n```",
                                'submitted_at' => $submittedAt,
                                'is_late' => $late,
                                'late_minutes' => $late ? (int) $target->due_at->diffInMinutes($submittedAt) : 0,
                                'version' => 1,
                                'is_current' => true,
                            ]);
                            $submission->forceFill(['receipt_number' => sprintf('IRL-%s-%06d', $submittedAt->format('ymd'), $submission->id)])->save();

                            $path = tempnam(sys_get_temp_dir(), 'sub');
                            file_put_contents($path, self::PDF);
                            $files->store(new UploadedFile($path, "Jawaban-{$enrollment->user_id}.pdf", null, null, true), ['pdf'], 'submission', $submission, $enrollment->user);

                            $this->grade($submission, $task, $class, $i);
                        }
                    });
                }
            });
    }

    /**
     * Tugas lama sudah dinilai & dipublikasikan; laporan terbaru sebagian
     * masih Draft/belum dinilai agar antrean penilaian terisi.
     */
    private function grade(Submission $submission, Task $task, LabClass $class, int $i): void
    {
        $published = str_starts_with($task->title, 'Post-Test Modul 05');
        $draft = str_starts_with($task->title, 'Laporan Modul 05') && $i % 3 === 0;

        if (! $published && ! $draft) {
            return;
        }

        $feedback = [
            "Analisis sudah tepat. Perhatikan penamaan variabel:\n\n```python\nlearning_rate = 0.01\n```",
            'Penjelasan konsep baik, namun kesimpulan kurang didukung data hasil percobaan.',
            null,
            'Kode berjalan, tetapi belum menangani kasus data kosong.',
        ][$i % 4];

        Grade::create([
            'submission_id' => $submission->id,
            'score' => 62 + (($i * 13 + 11) % 37),
            'feedback' => $feedback,
            'graded_by' => $class->assistants()->value('users.id'),
            'graded_at' => now()->subDays($published ? 4 : 1),
            'status' => $published ? 'published' : 'draft',
            'published_at' => $published ? now()->subDays(3) : null,
            'version' => 1,
        ]);
    }
}
