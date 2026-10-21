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
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;

/**
 * Tugas contoh per mata kuliah aktif + submission praktikan (untuk Grade).
 */
class TaskSeeder extends DemoSeeder
{
    /**
     * [jenis, judul, pertemuan, buka (hari), tenggat (hari), boleh terlambat, format, porsi yang mengumpulkan]
     *
     * @var list<array{TaskType, string, int, int|null, int|null, bool, list<'pdf'|'zip'|'image'>, float}>
     */
    private const TASKS = [
        [TaskType::Pretest, 'Pre-Test Pertemuan 07', 7, null, null, false, ['pdf'], 0.0],
        [TaskType::Posttest, 'Post-Test Pertemuan 06', 6, -6, 1, false, ['pdf', 'zip'], 0.4],
        [TaskType::Report, 'Laporan Pertemuan 05', 5, -10, -3, true, ['pdf'], 0.85],
        [TaskType::Posttest, 'Post-Test Pertemuan 05', 5, -12, -5, false, ['pdf'], 0.9],
    ];

    public function run(FileStore $files): void
    {
        $semester = Semester::current();

        Course::where('semester_id', $semester->id)->where('approval_status', 'approved')->with(['classes.enrollments.user', 'assistants'])->get()
            ->each(function (Course $course) use ($files) {
                $creator = $course->assistants->first();
                $body = fn (string $text, string $code) => ['type' => 'doc', 'content' => [
                    ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]],
                    ['type' => 'codeBlock', 'attrs' => ['language' => 'python'], 'content' => [['type' => 'text', 'text' => $code]]],
                ]];

                foreach (self::TASKS as [$type, $title, $meetingNumber, $open, $due, $allowLate, $formats, $submitRate]) {
                    $task = Task::create([
                        'semester_id' => $course->semester_id,
                        'course_id' => $course->id,
                        'type' => $type,
                        'title' => "{$title} · {$course->name}",
                        'body_json' => $body("Jelaskan konsep pada pertemuan ini dan implementasikan fungsi berikut untuk {$course->name}.", "def evaluate(model, data):\n    # TODO: lengkapi\n    return model.score(data)"),
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

                    $this->seedTargets($task, $course, $meetingNumber, $open, $due, $submitRate, $files);
                }
            });
    }

    /**
     * Target per kelas + submission contoh (sebagian praktikan, sesuai porsi).
     */
    private function seedTargets(Task $task, Course $course, int $meetingNumber, ?int $open, ?int $due, float $submitRate, FileStore $files): void
    {
        foreach ($course->classes->where('approval_status', 'approved') as $class) {
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
                continue;
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
                file_put_contents($path, self::answerPdf($enrollment->user->name, (string) $enrollment->user->nim, $task->title, $i));
                $files->store(new UploadedFile($path, "Jawaban-{$enrollment->user_id}.pdf", null, null, true), ['pdf'], 'submission', $submission, $enrollment->user);

                $this->grade($submission, $task, $class, $i);
            }
        }
    }

    /**
     * Tugas lama sudah dinilai & dipublikasikan; laporan terbaru sebagian
     * masih Draft/belum dinilai agar antrean penilaian terisi.
     */
    private function grade(Submission $submission, Task $task, LabClass $class, int $i): void
    {
        $published = str_starts_with($task->title, 'Post-Test Pertemuan 05');
        $draft = str_starts_with($task->title, 'Laporan Pertemuan 05') && $i % 3 === 0;

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

    /**
     * PDF jawaban satu halaman yang berisi teks (agar Split-Screen Grade tidak kosong).
     */
    private static function answerPdf(string $name, string $nim, string $title, int $i): string
    {
        // Font standar PDF hanya ASCII/Latin-1: "·" & huruf beraksen diubah ke ASCII.
        $esc = fn (string $text) => str_replace(['\\', '(', ')'], ['\\\\', '\(', '\)'], Str::ascii(str_replace('·', '-', $text)));
        $lines = [
            ['F2', 16, 'Lembar Jawaban Praktikum'],
            ['F1', 11, $title],
            ['F1', 11, "{$name} - NIM {$nim}"],
            ['F1', 11, ''],
            ['F2', 12, '1. Penjelasan'],
            ['F1', 11, 'Model dievaluasi dengan membagi data menjadi data latih dan data uji (80:20).'],
            ['F1', 11, 'Metrik yang digunakan adalah akurasi, presisi, dan recall pada data uji.'],
            ['F1', 11, 'Hasil terbaik diperoleh setelah normalisasi fitur dan penyetelan parameter.'],
            ['F1', 11, ''],
            ['F2', 12, '2. Implementasi'],
            ['F3', 10, 'def evaluate(model, data):'],
            ['F3', 10, '    X_train, X_test, y_train, y_test = split(data, 0.2)'],
            ['F3', 10, '    model.fit(X_train, y_train)'],
            ['F3', 10, '    return model.score(X_test, y_test)'],
            ['F1', 11, ''],
            ['F2', 12, '3. Hasil'],
            ['F1', 11, sprintf('Akurasi data uji: %.2f%%', 78 + ($i * 7) % 20)],
        ];

        $stream = "BT\n72 770 Td\n";
        foreach ($lines as [$font, $size, $text]) {
            $stream .= "/{$font} {$size} Tf\n(".$esc($text).") Tj\n0 -22 Td\n";
        }
        $stream .= "ET\n";

        $objects = [
            '<</Type/Catalog/Pages 2 0 R>>',
            '<</Type/Pages/Kids[3 0 R]/Count 1>>',
            '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Contents 4 0 R/Resources<</Font<</F1 5 0 R/F2 6 0 R/F3 7 0 R>>>>>>',
            '<</Length '.strlen($stream).">>\nstream\n{$stream}endstream",
            '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
            '<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold>>',
            '<</Type/Font/Subtype/Type1/BaseFont/Courier>>',
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $n => $body) {
            $offsets[] = strlen($pdf);
            $pdf .= ($n + 1)." 0 obj\n{$body}\nendobj\n";
        }

        $xref = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }

        return $pdf.'trailer<</Size '.(count($objects) + 1)."/Root 1 0 R>>\nstartxref\n{$xref}\n%%EOF\n";
    }
}
