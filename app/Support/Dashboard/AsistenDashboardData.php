<?php

namespace App\Support\Dashboard;

use App\Enums\ApprovalStatus;
use App\Enums\Position;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\TaskTarget;
use App\Models\User;
use App\Support\CourseColor;
use App\Support\Grading\GradingQueue;
use Carbon\CarbonImmutable;

/**
 * Data Dashboard Asisten (PRD FR-AD). Kontrak bentuk data ini dipakai halaman
 * React `asisten/dashboard` — lihat resources/js/types/dashboard.ts.
 *
 * SEMENTARA BERISI DATA CONTOH. Ganti tiap bagian dengan query asli begitu
 * modulnya dibangun, tanpa mengubah bentuk array yang dikembalikan:
 *  - pendingReports, nextShift, week (shift)  → modul Report & Shift (Rilis 3)
 *  - pendingGrading, gradingQueue              → ✅ data asli (modul Grade)
 *  - week (sesi kelas)                         → ✅ data asli (modul Kelas & Jadwal)
 *  - alerts                                    → ✅ due-soon asli; lainnya Tukar Shift, Report, Generate
 *  - activities                                → Submission, Enrollment, Program
 * Setelah semua bagian asli, hapus `isSample`.
 */
class AsistenDashboardData
{
    /**
     * Shift ngawas contoh per minggu (modul Shift belum ada).
     * day: 1 = Senin … 7 = Minggu (ISO-8601).
     *
     * @var list<array{0: int, 1: string, 2: string, 3: 'class'|'shift', 4: string, 5: string, 6: string, 7: string}>
     */
    private const SAMPLE_WEEK = [
        [3, '13:00', '16:00', 'shift', 'Ngawas Lab', 'Shift siang', 'Lab IR 1', 'teal'],
        [6, '08:00', '12:00', 'shift', 'Ngawas Lab', 'Shift pagi', 'Lab IR 2', 'teal'],
    ];

    /**
     * @return array<string, mixed>
     */
    public static function for(User $user, ?CarbonImmutable $now = null): array
    {
        $now ??= CarbonImmutable::now();
        $weekStart = $now->startOfWeek(CarbonImmutable::MONDAY);

        $gradingQueue = GradingQueue::for($user);
        // Kartu Figma "Pre/Post-Test belum dinilai" hanya menghitung pre/post-test.
        $pendingGrading = GradingQueue::pendingTests($user);

        $events = self::weekEvents($user, $weekStart, $now);

        return [
            'isSample' => true,
            'pendingReports' => 1,
            'pendingGrading' => $pendingGrading,
            'nextShift' => self::nextShift($weekStart, $now),
            'alerts' => self::alerts($user),
            'week' => [
                'start' => $weekStart->toDateString(),
                'today' => $now->dayOfWeekIso,
                'events' => $events,
            ],
            'gradingQueue' => $gradingQueue,
            'activities' => [
                ['id' => 'ac-1', 'type' => 'submission', 'message' => 'Rina Praktikan mengumpulkan Post-Test Modul 04 (Machine Learning · Kelas A)', 'at' => $now->subMinutes(12)->toIso8601String()],
                ['id' => 'ac-2', 'type' => 'enrollment', 'message' => '3 praktikan bergabung ke Deep Learning · Kelas B', 'at' => $now->subHours(2)->toIso8601String()],
                ['id' => 'ac-3', 'type' => 'program', 'message' => 'Pendaftar baru Workshop "Intro to RAG": 5 orang', 'at' => $now->subHours(5)->toIso8601String()],
                ['id' => 'ac-4', 'type' => 'submission', 'message' => 'Bagas Pratama mengumpulkan Laporan Modul 02 (Mobile Programming · Kelas C) — terlambat 2 jam', 'at' => $now->subDay()->toIso8601String()],
            ],
        ];
    }

    /**
     * Sesi kelas yang diampu (asli) + shift ngawas (contoh) minggu ini.
     *
     * @return list<array<string, mixed>>
     */
    private static function weekEvents(User $user, CarbonImmutable $weekStart, CarbonImmutable $now): array
    {
        $semester = Semester::current();

        $classes = $semester
            ? LabClass::forSemester($semester)
                ->where('approval_status', ApprovalStatus::Approved)
                ->whereHas('assistants', fn ($query) => $query->whereKey($user->id))
                ->with(['course', 'room'])
                ->get()
                ->map(fn (LabClass $class) => [
                    'id' => "class-{$class->id}",
                    'type' => 'class',
                    'title' => $class->course->name,
                    'subtitle' => $class->name,
                    'room' => $class->room->name,
                    'day' => $class->day_of_week,
                    'start' => $class->startClock(),
                    'end' => $class->endClock(),
                    'color' => CourseColor::for($class->course_id),
                ])
            : collect();

        $shifts = collect(self::SAMPLE_WEEK)->map(fn (array $row, int $index) => [
            'id' => "shift-{$index}",
            'type' => 'shift',
            'title' => $row[4],
            'subtitle' => $row[5],
            'room' => $row[6],
            'day' => $row[0],
            'start' => $row[1],
            'end' => $row[2],
            'color' => $row[7],
        ]);

        return $classes->concat($shifts)->map(function (array $event) use ($weekStart, $now) {
            [$startsAt, $endsAt] = self::bounds($weekStart, $event['day'], $event['start'], $event['end']);

            return [...$event, 'running' => $now->betweenIncluded($startsAt, $endsAt)];
        })->values()->all();
    }

    /**
     * Shift ngawas berikutnya (minggu ini atau minggu depan).
     *
     * @return array{title: string, room: string, startsAt: string, endsAt: string}|null
     */
    private static function nextShift(CarbonImmutable $weekStart, CarbonImmutable $now): ?array
    {
        return collect([$weekStart, $weekStart->addWeek()])
            ->flatMap(fn (CarbonImmutable $week) => collect(self::SAMPLE_WEEK)
                ->where(3, 'shift')
                ->map(function (array $row) use ($week) {
                    [$startsAt, $endsAt] = self::bounds($week, $row[0], $row[1], $row[2]);

                    return ['title' => "{$row[4]} · {$row[5]}", 'room' => $row[6], 'startsAt' => $startsAt, 'endsAt' => $endsAt];
                }))
            ->filter(fn (array $shift) => $shift['endsAt']->isAfter($now))
            ->sortBy('startsAt')
            ->map(fn (array $shift) => [
                ...$shift,
                'startsAt' => $shift['startsAt']->toIso8601String(),
                'endsAt' => $shift['endsAt']->toIso8601String(),
            ])
            ->first();
    }

    /**
     * Metrik "perlu tindakan" (FR-AD-2); jabatan membuka metrik tambahan.
     *
     * @return list<array{key: string, label: string, count: int, href: string, tone: 'warning'|'danger'|'info'}>
     */
    private static function alerts(User $user): array
    {
        $alerts = [
            ['key' => 'due-soon', 'label' => 'tugas mendekati tenggat', 'count' => self::dueSoon($user), 'href' => '/asisten/task', 'tone' => 'warning'],
            ['key' => 'shift-swaps', 'label' => 'permintaan tukar shift', 'count' => 1, 'href' => '/asisten/schedule', 'tone' => 'info'],
        ];

        if ($user->position === Position::Sekretaris) {
            $alerts[] = ['key' => 'to-verify', 'label' => 'laporan ngawas menunggu verifikasi', 'count' => 4, 'href' => '/asisten/report', 'tone' => 'warning'];
        }

        if ($user->position === Position::Bendahara) {
            $alerts[] = ['key' => 'honor', 'label' => 'rekap honor menunggu persetujuan', 'count' => 1, 'href' => '/asisten/generate', 'tone' => 'warning'];
        }

        return $alerts;
    }

    /**
     * Tugas terbit di kelas yang diampu dengan tenggat dalam 24 jam ke depan.
     */
    private static function dueSoon(User $user): int
    {
        return TaskTarget::whereBetween('due_at', [now(), now()->addDay()])
            ->whereHas('task', fn ($q) => $q->where('status', 'published'))
            ->whereHas('labClass', fn ($q) => $q->taughtBy($user))
            ->count();
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private static function bounds(CarbonImmutable $weekStart, int $day, string $start, string $end): array
    {
        $date = $weekStart->addDays($day - 1);

        return [
            $date->setTimeFromTimeString($start),
            $date->setTimeFromTimeString($end),
        ];
    }
}
