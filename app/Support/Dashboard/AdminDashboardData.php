<?php

namespace App\Support\Dashboard;

use App\Enums\ApprovalStatus;
use App\Models\Course;
use App\Models\LabClass;
use App\Models\Semester;
use App\Support\ClassDays;
use Carbon\CarbonImmutable;

/**
 * Data Dashboard Admin (PRD FR-ADM-01). Kontrak bentuk data ini dipakai halaman
 * React `admin/dashboard` — lihat resources/js/types/dashboard.ts.
 *
 * SEMENTARA BERISI DATA CONTOH. Ganti tiap bagian dengan query asli begitu
 * modulnya dibangun, tanpa mengubah bentuk array yang dikembalikan:
 *  - semester                        → ✅ data asli (modul Semester)
 *  - counts.courses                  → ✅ data asli (modul Mata Kuliah)
 *  - counts.classes                  → ✅ data asli (modul Kelas)
 *  - counts (lainnya)                → Pengguna (Rilis 1)
 *  - approvals                       → ✅ data asli (Mata Kuliah & Kelas)
 *  - reportCompliance                → Report Ngawas (Rilis 3)
 *  - gradingQueue                    → Grade (Rilis 2)
 *  - activePrograms                  → Program (Rilis 4)
 *  - auditLogs                       → Audit Log (Rilis 1)
 * Setelah semua bagian asli, hapus `isSample`.
 */
class AdminDashboardData
{
    /**
     * Semester aktif + minggu ke berapa (dibatasi 1 … total minggu).
     *
     * @return array{name: string, startsOn: string, endsOn: string, week: int, totalWeeks: int}|null
     */
    public static function semester(?Semester $semester, CarbonImmutable $now): ?array
    {
        if (! $semester) {
            return null;
        }

        $start = CarbonImmutable::parse($semester->start_date->toDateString(), $now->timezone);
        $end = CarbonImmutable::parse($semester->end_date->toDateString(), $now->timezone);
        $totalWeeks = (int) $start->diffInWeeks($end) + 1;

        return [
            'name' => $semester->name,
            'startsOn' => $start->toDateString(),
            'endsOn' => $end->toDateString(),
            'week' => (int) min(max(1, $start->diffInWeeks($now) + 1), $totalWeeks),
            'totalWeeks' => $totalWeeks,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function for(?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();

        $active = Semester::current();

        return [
            'isSample' => true,
            'semester' => self::semester($active, $now),
            'counts' => [
                'praktikan' => 186,
                'asisten' => 14,
                'classes' => $active ? LabClass::forSemester($active)->where('approval_status', ApprovalStatus::Approved)->count() : 0,
                'courses' => $active ? Course::forSemester($active)->where('approval_status', ApprovalStatus::Approved)->count() : 0,
            ],
            // KPI PRD Bagian 1: laporan ngawas tercatat di hari yang sama ≥ 90%.
            'reportCompliance' => [
                'month' => $now->locale('id')->translatedFormat('F Y'),
                'onTime' => 41,
                'submitted' => 44,
                'expected' => 46,
                'target' => 90,
            ],
            'approvals' => $active ? self::approvals($active) : [],
            'gradingQueue' => [
                ['id' => 'gq-1', 'course' => 'Machine Learning', 'className' => 'Kelas A', 'task' => 'Post-Test Modul 04', 'type' => 'posttest', 'graded' => 18, 'submitted' => 40, 'href' => '/admin/grade/post-test'],
                ['id' => 'gq-2', 'course' => 'Mobile Programming', 'className' => 'Kelas C', 'task' => 'Laporan Modul 02', 'type' => 'report', 'graded' => 10, 'submitted' => 30, 'href' => '/admin/grade/laporan'],
                ['id' => 'gq-3', 'course' => 'Information Retrieval', 'className' => 'Kelas B', 'task' => 'Pre-Test Modul 05', 'type' => 'pretest', 'graded' => 12, 'submitted' => 28, 'href' => '/admin/grade/pre-test'],
                ['id' => 'gq-4', 'course' => 'Deep Learning', 'className' => 'Kelas A', 'task' => 'Pre-Test Modul 03', 'type' => 'pretest', 'graded' => 30, 'submitted' => 32, 'href' => '/admin/grade/pre-test'],
            ],
            'activePrograms' => [
                ['id' => 'pg-1', 'type' => 'Workshop', 'title' => 'Intro to Retrieval-Augmented Generation', 'status' => 'Pendaftaran dibuka', 'registered' => 27, 'quota' => 40, 'href' => '/admin/program/workshop'],
                ['id' => 'pg-2', 'type' => 'Rekrutmen', 'title' => 'Rekrutmen Asisten 2026', 'status' => 'Tahap: Tes Coding', 'registered' => 58, 'quota' => null, 'href' => '/admin/program/recruitment'],
                ['id' => 'pg-3', 'type' => 'Quick Tutor', 'title' => 'Struktur Data untuk UTS', 'status' => 'Berjalan', 'registered' => 18, 'quota' => 20, 'href' => '/admin/program/quick-tutor'],
            ],
            'auditLogs' => [
                ['id' => 'au-1', 'actor' => 'Admin Lab', 'action' => 'mengubah kontrak kursi', 'target' => 'Rina Praktikan · PC-12 → PC-07 (ML · Kelas A)', 'at' => $now->subMinutes(25)->toIso8601String()],
                ['id' => 'au-2', 'actor' => 'Dimas Asisten', 'action' => 'memverifikasi laporan ngawas', 'target' => 'Shift Rabu, 30 Sep · Lab IR 1', 'at' => $now->subHours(4)->toIso8601String()],
                ['id' => 'au-3', 'actor' => 'Admin Lab', 'action' => 'menetapkan jabatan', 'target' => 'Dimas Asisten → Sekretaris', 'at' => $now->subDay()->toIso8601String()],
                ['id' => 'au-4', 'actor' => 'Admin Lab', 'action' => 'mengimpor akun', 'target' => '42 praktikan dari praktikan-ganjil-2026.xlsx', 'at' => $now->subDays(3)->toIso8601String()],
            ],
        ];
    }

    /**
     * FR-ADM-03: pengajuan Mata Kuliah (dan nanti Kelas) yang menunggu persetujuan.
     *
     * @return list<array<string, mixed>>
     */
    private static function approvals(Semester $semester): array
    {
        $courses = Course::forSemester($semester)->pending()->with('proposer')->get()
            ->map(fn (Course $course) => [
                'id' => "course-{$course->id}",
                'type' => 'course',
                'name' => $course->name,
                'detail' => "{$course->code} · {$course->credits} SKS · bobot {$course->weight_pretest}/{$course->weight_posttest}/{$course->weight_report}",
                'requestedBy' => $course->proposer?->name ?? '—',
                'requestedAt' => $course->created_at->toIso8601String(),
                'href' => '/admin/courses?semester='.$semester->id,
            ]);

        $classes = LabClass::forSemester($semester)->pending()->with(['proposer', 'course', 'room'])->get()
            ->map(fn (LabClass $class) => [
                'id' => "class-{$class->id}",
                'type' => 'class',
                'name' => "{$class->course->name} · {$class->name}",
                'detail' => sprintf('%s %s–%s · %s · kuota %d', ClassDays::NAMES[$class->day_of_week], $class->startClock(), $class->endClock(), $class->room->name, $class->quota),
                'requestedBy' => $class->proposer?->name ?? '—',
                'requestedAt' => $class->created_at->toIso8601String(),
                'href' => '/admin/classes?semester='.$semester->id,
            ]);

        return $courses->concat($classes)->sortBy('requestedAt')->values()->all();
    }
}
