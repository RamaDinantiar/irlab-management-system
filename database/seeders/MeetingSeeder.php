<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Support\Files\FileStore;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Http\UploadedFile;

/**
 * Pertemuan 1–8 tiap kelas aktif: yang sudah lewat → dimulai + presensi;
 * modul PDF dirilis hingga minggu ini.
 */
class MeetingSeeder extends Seeder
{
    private const TOPICS = ['Pengantar & Setup Lingkungan', 'Preprocessing Data', 'Model Dasar', 'Klasifikasi', 'Evaluasi Model', 'Optimasi', 'Studi Kasus', 'Proyek Akhir'];

    private const PDF = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";

    public function run(FileStore $files): void
    {
        $today = CarbonImmutable::today();

        LabClass::with(['semester', 'assistants', 'enrollments'])->where('approval_status', 'approved')->get()
            ->each(function (LabClass $class) use ($files, $today) {
                $start = CarbonImmutable::parse($class->semester->start_date);
                $first = $start->dayOfWeekIso === $class->day_of_week ? $start : $start->next($class->day_of_week % 7);
                $assistant = $class->assistants->first();

                foreach (self::TOPICS as $index => $topic) {
                    $date = $first->addWeeks($index);
                    $meeting = Meeting::create([
                        'class_id' => $class->id,
                        'number' => $index + 1,
                        'date' => $date->toDateString(),
                        'module_title' => sprintf('Modul %02d · %s', $index + 1, $topic),
                        'module_release_at' => $date->subDays(2)->setTime(8, 0),
                        'responsible_assistant_id' => $assistant?->id,
                        'started_at' => $date->lt($today) ? $date->setTimeFromTimeString($class->start_time) : null,
                    ]);

                    if ($date->lte($today->addWeek())) {
                        $path = tempnam(sys_get_temp_dir(), 'modul');
                        file_put_contents($path, self::PDF);
                        $file = $files->store(new UploadedFile($path, sprintf('Modul-%02d.pdf', $index + 1), null, null, true), ['pdf'], 'module', $meeting, $assistant);
                        $meeting->update(['module_file_id' => $file->id]);
                    }

                    if ($meeting->started_at) {
                        foreach ($class->enrollments as $i => $enrollment) {
                            Attendance::create([
                                'meeting_id' => $meeting->id,
                                'user_id' => $enrollment->user_id,
                                'status' => ['hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'hadir', 'izin', 'sakit', 'alfa'][($i + $index) % 10],
                                'recorded_by' => $assistant?->id,
                            ]);
                        }
                    }
                }
            });
    }
}
