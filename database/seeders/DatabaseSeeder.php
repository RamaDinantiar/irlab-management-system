<?php

namespace Database\Seeders;

use App\Enums\Position;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\Room;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Akun demo per peran (persona PRD Bagian 2). Kata sandi semua: "password".
     */
    public function run(): void
    {
        $rina = User::factory()->create([
            'nim' => '202331001',
            'name' => 'Rina Praktikan',
            'email' => 'praktikan@irlab.test',
        ]);

        $dimas = User::factory()->asisten(Position::Sekretaris)->create([
            'nim' => '202131002',
            'name' => 'Dimas Asisten',
            'email' => 'asisten@irlab.test',
            'cohort_year' => 2021,
        ]);

        User::factory()->admin()->create([
            'name' => 'Admin Lab',
            'email' => 'admin@irlab.test',
        ]);

        $michael = User::factory()->asisten()->create(['nim' => '202131010', 'name' => 'Michael Christia', 'email' => 'michael@irlab.test', 'cohort_year' => 2021]);
        $yozika = User::factory()->asisten(Position::Bendahara)->create(['nim' => '202131011', 'name' => 'Yozika Arvio', 'email' => 'yozika@irlab.test', 'cohort_year' => 2021]);

        // Semester contoh: arsip lama (bisa dihapus permanen), arsip, aktif, draft.
        Semester::factory()->archived()->create(['name' => 'Ganjil 2022/2023', 'start_date' => '2022-08-22', 'end_date' => '2022-12-16']);
        $previous = Semester::factory()->archived()->create(['name' => 'Genap 2025/2026', 'start_date' => '2026-02-16', 'end_date' => '2026-06-19']);
        $active = Semester::factory()->active()->create(['name' => 'Ganjil 2026/2027', 'start_date' => '2026-08-24', 'end_date' => '2026-12-18']);
        Semester::factory()->create(['name' => 'Genap 2026/2027', 'start_date' => '2027-02-15', 'end_date' => '2027-06-18']);

        // Mata kuliah (nama sesuai jadwal di Figma).
        $courses = [
            ['IF-3101', 'Machine Learning', [20, 30, 50], [$dimas]],
            ['IF-3102', 'Deep Learning', [20, 30, 50], [$yozika]],
            ['IF-3103', 'Information Retrieval', [25, 25, 50], [$dimas, $michael]],
            ['IF-3205', 'Mobile Programming', [15, 35, 50], [$michael]],
            ['IF-2104', 'Database System', [20, 20, 60], [$yozika]],
        ];

        $byCode = [];

        foreach ([$previous, $active] as $semester) {
            foreach ($courses as [$code, $name, [$pre, $post, $report], $assistants]) {
                $course = Course::factory()->for($semester)->create([
                    'code' => $code, 'name' => $name, 'credits' => 3,
                    'weight_pretest' => $pre, 'weight_posttest' => $post, 'weight_report' => $report,
                ]);
                $course->assistants()->attach(collect($assistants)->pluck('id'));
                $byCode[$semester->id][$code] = $course;
            }
        }

        // Ruang & kelas semester aktif (jadwal sesuai frame Figma "Dashboard").
        $lab1 = Room::factory()->create(['name' => 'Lab IR 1', 'rows' => 6, 'cols' => 8]);
        $lab2 = Room::factory()->create(['name' => 'Lab IR 2', 'rows' => 5, 'cols' => 8]);

        $classes = [
            ['IF-3101', 'Kelas A', 1, '07:20', '09:50', $lab1, [$dimas]],
            ['IF-3101', 'Kelas C', 1, '10:10', '12:40', $lab1, [$dimas]],
            ['IF-3205', 'Kelas C', 1, '15:00', '16:40', $lab2, [$michael]],
            ['IF-3102', 'Kelas A', 2, '07:20', '09:50', $lab2, [$yozika]],
            ['IF-2104', 'Kelas A', 2, '10:10', '12:40', $lab1, [$yozika]],
            ['IF-3103', 'Kelas B', 2, '13:00', '14:40', $lab1, [$dimas, $michael]],
            ['IF-3102', 'Kelas B', 4, '10:10', '12:40', $lab2, [$yozika]],
            ['IF-3103', 'Kelas A', 4, '13:00', '14:40', $lab1, [$dimas]],
            ['IF-3205', 'Kelas A', 5, '10:10', '11:50', $lab2, [$michael]],
        ];

        $created = [];

        foreach ($classes as [$code, $name, $day, $start, $end, $room, $assistants]) {
            $created["{$code} {$name}"] = LabClass::factory()->create([
                'course_id' => $byCode[$active->id][$code]->id,
                'semester_id' => $active->id,
                'name' => $name, 'day_of_week' => $day, 'start_time' => $start, 'end_time' => $end,
                'room_id' => $room->id, 'quota' => 30,
            ]);
            $created["{$code} {$name}"]->assistants()->attach(collect($assistants)->pluck('id'));
        }

        // Anggota kelas: Rina (4 kelas seperti contoh Figma) + 60 praktikan contoh.
        // Satu mata kuliah hanya di satu kelas per praktikan (FR-ENR-05).
        $students = User::factory()->count(60)->create();
        [$groupA, $groupB] = [$students->slice(0, 30)->values(), $students->slice(30)->values()];

        $members = [
            'IF-3101 Kelas A' => [$rina, ...$groupA->slice(0, 20)],
            'IF-3101 Kelas C' => $groupB->slice(0, 18)->all(),
            'IF-3102 Kelas A' => [$rina, ...$groupA->slice(0, 15)],
            'IF-3102 Kelas B' => $groupB->slice(0, 22)->all(),
            'IF-3103 Kelas A' => [$rina, ...$groupA->slice(0, 29)], // 30/30 → penuh & terkunci
            'IF-3103 Kelas B' => $groupB->slice(0, 12)->all(),
            'IF-3205 Kelas A' => [$rina, ...$groupA->slice(5, 20)],
            'IF-3205 Kelas C' => $groupB->slice(10, 20)->all(),
            'IF-2104 Kelas A' => $groupA->slice(0, 25)->all(),
        ];

        foreach ($members as $key => $users) {
            $class = $created[$key];
            Enrollment::insert(collect($users)->map(fn (User $user) => [
                'class_id' => $class->id, 'user_id' => $user->id,
                'joined_at' => now(), 'created_at' => now(), 'updated_at' => now(),
            ])->all());

            if (count($users) >= $class->quota) {
                $class->forceFill(['is_locked' => true])->save();
            }
        }

        // Pengajuan kelas dari Asisten (menunggu persetujuan Admin).
        LabClass::factory()->pending($dimas)->create([
            'course_id' => $byCode[$active->id]['IF-3103']->id,
            'semester_id' => $active->id,
            'name' => 'Kelas C', 'day_of_week' => 5, 'start_time' => '13:00', 'end_time' => '14:40',
            'room_id' => $lab1->id, 'quota' => 25,
        ])->assistants()->attach($dimas);

        // Pengajuan Asisten yang menunggu persetujuan Admin.
        Course::factory()->for($active)->pending($michael)->create([
            'code' => 'IF-3104', 'name' => 'Natural Language Processing', 'credits' => 3,
            'weight_pretest' => 20, 'weight_posttest' => 30, 'weight_report' => 50,
        ])->assistants()->attach($michael);

        $this->call([MeetingSeeder::class, TaskSeeder::class, SeatSeeder::class, OperationsSeeder::class]);
    }
}
