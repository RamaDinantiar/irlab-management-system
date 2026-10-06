<?php

namespace Database\Seeders;

use App\Enums\ProgramType;
use App\Enums\Role;
use App\Models\Program;
use App\Models\ProgramRegistration;
use App\Models\Room;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Program contoh: Workshop, Quick Tutor, Rekrutmen (aktif + arsip), Maintenance.
 * Aman dijalankan ulang: dilewati bila sudah ada program.
 */
class ProgramSeeder extends Seeder
{
    public function run(): void
    {
        if (Program::exists()) {
            $this->command?->info('Program sudah ada — ProgramSeeder dilewati.');

            return;
        }

        $semester = Semester::current();
        $dimas = User::where('email', 'asisten@irlab.test')->first();
        $michael = User::where('email', 'michael@irlab.test')->first();
        $students = User::where('role', Role::Praktikan)->where('is_active', true)->where('email', '!=', 'praktikan@irlab.test')->orderBy('id')->get();
        $base = ['semester_id' => $semester?->id, 'created_by' => $dimas?->id];

        $rag = Program::create([...$base, 'type' => ProgramType::Workshop, 'title' => 'Hands-on Large Language Models & RAG Implementation', 'category' => 'Artificial Intelligence',
            'description' => 'Pelatihan intensif arsitektur **Retrieval-Augmented Generation** dengan LangChain dan vector database. Peserta membangun sistem QA dokumen ilmiah.',
            'speaker_name' => 'Dr. Ir. Hendra, M.Kom', 'speaker_affiliation' => 'Dosen Pembina & Tim Peneliti Rekayasa Data', 'mode' => 'offline', 'location' => 'Lab IR',
            'starts_at' => now()->addDays(12)->setTime(9, 0), 'ends_at' => now()->addDays(12)->setTime(15, 30), 'quota' => 40, 'fee_internal' => 35000, 'fee_external' => 50000,
            'facilities' => ['E-Sertifikat Terverifikasi', 'Modul Repo & Starter Code'], 'status' => 'open', 'opens_at' => now()->subDays(3), 'closes_at' => now()->addDays(8)]);
        $cv = Program::create([...$base, 'type' => ProgramType::Workshop, 'title' => 'Deep Learning for Computer Vision & Object Detection', 'category' => 'Computer Vision',
            'description' => 'Workshop YOLO dan transfer learning untuk deteksi objek.', 'speaker_name' => 'Dr. Efy Yosrita, S.Si., M.Kom', 'speaker_affiliation' => 'Kepala Laboratorium Information Retrieval',
            'mode' => 'online', 'location' => 'https://zoom.us/j/irlab', 'starts_at' => now()->subDays(5)->setTime(9, 0), 'ends_at' => now()->subDays(5)->setTime(15, 30), 'quota' => 20,
            'status' => 'closed', 'opens_at' => now()->subDays(20), 'closes_at' => now()->subDays(7)]);
        $tutor = Program::create([...$base, 'type' => ProgramType::QuickTutor, 'title' => 'Struktur Data untuk UTS', 'category' => 'Algoritma',
            'description' => 'Sesi tutor singkat: tree, graph, dan hashing sebelum UTS.', 'speaker_name' => 'Dimas Asisten', 'speaker_affiliation' => 'Asisten Lab IR', 'mode' => 'offline',
            'location' => 'Lab IR', 'starts_at' => now()->addDays(4)->setTime(15, 0), 'ends_at' => now()->addDays(4)->setTime(17, 0), 'quota' => 20, 'status' => 'open', 'opens_at' => now()->subDay(), 'closes_at' => now()->addDays(3)]);

        foreach ([$rag, $cv, $tutor] as $program) {
            $phone = $program->fields()->create(['order' => 1, 'label' => 'Nomor WhatsApp', 'type' => 'text', 'required' => true]);
            $program->fields()->create(['order' => 2, 'label' => 'Motivasi mengikuti program', 'type' => 'textarea', 'required' => false]);
            $count = ['Hands-on Large Language Models & RAG Implementation' => 27, 'Deep Learning for Computer Vision & Object Detection' => 20, 'Struktur Data untuk UTS' => 12][$program->title];
            foreach ($students->take($count) as $i => $student) {
                ProgramRegistration::create(['program_id' => $program->id, 'user_id' => $student->id, 'answers_json' => [(string) $phone->id => '0812'.str_pad((string) ($i * 7919 % 100000000), 8, '0')],
                    'status' => 'registered', 'attended' => $program->status === 'closed' && $i % 6 !== 0, 'created_at' => now()->subDays(2)->subHours($i)]);
            }
        }

        // Rekrutmen aktif dengan pipeline.
        $recruitment = Program::create([...$base, 'type' => ProgramType::Recruitment, 'title' => 'Rekrutmen Asisten Lab IR 2026/2027',
            'description' => 'Seleksi calon asisten praktikum Information Retrieval, Machine Learning, dan Deep Learning.',
            'requirements' => ['IPK minimal 3.25', 'Nilai A/AB pada mata kuliah prasyarat', 'Menguasai Python'], 'quota' => 80,
            'status' => 'open', 'opens_at' => now()->subDays(10), 'closes_at' => now()->addDays(4)]);
        $stages = collect([['Seleksi Berkas', -10, -2], ['Tes Tertulis', 0, 2], ['Tes Coding', 5, 6], ['Wawancara', 9, 11], ['Pengumuman', 14, 14]])
            ->map(fn ($s, $i) => $recruitment->stages()->create(['order' => $i + 1, 'name' => $s[0], 'start_at' => now()->addDays($s[1])->toDateString(), 'end_at' => now()->addDays($s[2])->toDateString()]));
        $ipk = $recruitment->fields()->create(['order' => 1, 'label' => 'IPK terakhir', 'type' => 'number', 'required' => true]);
        $lang = $recruitment->fields()->create(['order' => 2, 'label' => 'Bahasa pemrograman utama', 'type' => 'select', 'required' => true, 'options' => ['Python', 'Java', 'Go', 'JavaScript']]);
        $recruitment->fields()->create(['order' => 3, 'label' => 'CV', 'type' => 'file', 'required' => false, 'rules_json' => ['formats' => ['pdf'], 'max_mb' => 5]]);
        foreach ($students->slice(30, 14)->values() as $i => $student) {
            $passed = $i < 9;
            ProgramRegistration::create(['program_id' => $recruitment->id, 'user_id' => $student->id,
                'answers_json' => [(string) $ipk->id => round(3.1 + ($i % 9) / 10, 2), (string) $lang->id => ['Python', 'Java', 'Go'][$i % 3]],
                'current_stage_id' => $i < 11 ? ($passed ? $stages[1]->id : $stages[0]->id) : $stages[0]->id,
                'status' => $i < 9 ? 'passed_docs' : ($i < 11 ? 'rejected' : 'registered'),
                'stage_results' => $i < 11 ? [(string) $stages[0]->id => ['result' => $passed ? 'pass' : 'fail', 'note' => $passed ? 'Berkas lengkap' : 'IPK di bawah syarat', 'by' => 'Dimas Asisten', 'at' => now()->subDays(2)->toIso8601String()]] : null,
                'created_at' => now()->subDays(9 - $i % 8)]);
        }

        // Arsip rekrutmen tahun lalu.
        $archive = Program::create([...$base, 'semester_id' => null, 'type' => ProgramType::Recruitment, 'title' => 'Rekrutmen Asisten Lab IR 2025/2026',
            'description' => 'Rekrutmen periode sebelumnya.', 'requirements' => ['IPK minimal 3.25'], 'status' => 'finished',
            'starts_at' => now()->subYear(), 'opens_at' => now()->subYear(), 'closes_at' => now()->subYear()->addWeeks(2)]);
        $final = $archive->stages()->create(['order' => 1, 'name' => 'Wawancara']);
        foreach ($students->slice(45, 10)->values() as $i => $student) {
            ProgramRegistration::create(['program_id' => $archive->id, 'user_id' => $student->id, 'current_stage_id' => $final->id, 'status' => $i < 4 ? 'accepted' : 'rejected']);
        }

        // Log maintenance.
        $lab = Room::where('name', 'Lab IR')->value('id');
        foreach ([
            ['Update OS & antivirus Lab IR', -14, $lab, 'PC-01 s.d. PC-40: update Windows, definisi antivirus.', 'Selesai. Semua PC terbarui.'],
            ['Penggantian perangkat input', -6, $lab, 'Mouse PC-12, keyboard PC-27.', 'Mouse diganti; keyboard PC-27 menunggu stok.'],
            ['Pengecekan jaringan & proyektor', 3, $lab, 'Switch utama, kabel LAN baris 3, proyektor.', null],
        ] as [$title, $day, $room, $devices, $result]) {
            Program::create([...$base, 'type' => ProgramType::Maintenance, 'title' => $title, 'description' => $devices, 'room_id' => $room,
                'starts_at' => now()->addDays($day)->setTime(16, 0), 'ends_at' => now()->addDays($day)->setTime(18, 0),
                'staff_ids' => array_values(array_filter([$dimas?->id, $michael?->id])), 'result_notes' => $result, 'status' => 'finished']);
        }
    }
}
