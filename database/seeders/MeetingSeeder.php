<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\LabClass;
use App\Models\Meeting;
use Carbon\CarbonImmutable;

/**
 * Pertemuan 1–8 tiap kelas aktif beserta topiknya: yang sudah lewat → dimulai + presensi.
 */
class MeetingSeeder extends DemoSeeder
{
    private const TOPICS = ['Pengantar & Setup Lingkungan', 'Preprocessing Data', 'Model Dasar', 'Klasifikasi', 'Evaluasi Model', 'Optimasi', 'Studi Kasus', 'Proyek Akhir'];

    public function run(): void
    {
        $today = CarbonImmutable::today();

        LabClass::with(['semester', 'assistants', 'enrollments'])->where('approval_status', 'approved')->get()
            ->each(function (LabClass $class) use ($today) {
                $start = CarbonImmutable::parse($class->semester->start_date);
                $first = $start->dayOfWeekIso === $class->day_of_week ? $start : $start->next($class->day_of_week % 7);
                $assistant = $class->assistants->first();

                foreach (self::TOPICS as $index => $topic) {
                    $date = $first->addWeeks($index);
                    $meeting = Meeting::create([
                        'class_id' => $class->id,
                        'number' => $index + 1,
                        'date' => $date->toDateString(),
                        'topic' => $topic,
                        'responsible_assistant_id' => $assistant?->id,
                        'started_at' => $date->lt($today) ? $date->setTimeFromTimeString($class->start_time) : null,
                    ]);

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
