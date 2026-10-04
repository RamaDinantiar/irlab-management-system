<?php

namespace App\Support\Dashboard;

use App\Enums\ApprovalStatus;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\TaskTarget;
use App\Models\User;
use App\Support\CourseColor;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data Dashboard Praktikan (PRD FR-PD). Kontrak bentuk data ini dipakai halaman
 * React `praktikan/dashboard` — lihat resources/js/types/dashboard.ts.
 *
 * SEMENTARA BERISI DATA CONTOH. Ganti tiap bagian dengan query asli begitu
 * modulnya dibangun, tanpa mengubah bentuk array yang dikembalikan:
 *  - hasClasses, week, nextClass        → ✅ data asli (Kelas & Enrollment)
 *  - nextClass.module                   → Pertemuan & Modul (Rilis 2)
 *  - nextClass.seat                     → Seats (Rilis 3)
 *  - pendingTasks, upcomingTasks        → ✅ data asli (Task & Submission)
 *  - courseProgress, recentFeedback     → Grade (Rilis 2)
 *  - announcements                      → Pengumuman (Rilis 3)
 *  - openProgram                        → Program (Rilis 4)
 * Setelah semua bagian asli, hapus `isSample`.
 */
class PraktikanDashboardData
{
    /**
     * @return array<string, mixed>
     */
    public static function for(User $user, ?CarbonImmutable $now = null, bool $withoutClasses = false): array
    {
        $now ??= CarbonImmutable::now();
        $weekStart = $now->startOfWeek(CarbonImmutable::MONDAY);

        $classes = $withoutClasses ? collect() : self::enrolledClasses($user);

        if ($classes->isEmpty()) {
            return self::empty($weekStart, $now);
        }

        [$upcomingTasks, $pendingTasks] = self::tasks($user, $now);

        return [
            'isSample' => true,
            'hasClasses' => true,
            'nextClass' => self::nextClass($classes, $weekStart, $now),
            'pendingTasks' => $pendingTasks,
            'openProgram' => [
                'title' => 'Workshop: Intro to Retrieval-Augmented Generation',
                'type' => 'Workshop',
                'closesAt' => $now->addDays(6)->setTime(23, 59)->toIso8601String(),
                'quota' => 40,
                'registered' => 27,
                'href' => '/praktikan/program/workshop',
            ],
            'week' => [
                'start' => $weekStart->toDateString(),
                'today' => $now->dayOfWeekIso,
                'events' => self::weekEvents($classes, $weekStart, $now),
            ],
            // FR-PD-3: maksimal 5 tugas dengan tenggat terdekat.
            'upcomingTasks' => $upcomingTasks,
            'courseProgress' => [
                ['id' => 'cp-1', 'course' => 'Machine Learning', 'className' => 'Kelas A', 'submitted' => 7, 'total' => 9, 'score' => 84.5, 'href' => '/praktikan/grade'],
                ['id' => 'cp-2', 'course' => 'Deep Learning', 'className' => 'Kelas A', 'submitted' => 5, 'total' => 8, 'score' => 78.0, 'href' => '/praktikan/grade'],
                ['id' => 'cp-3', 'course' => 'Information Retrieval', 'className' => 'Kelas A', 'submitted' => 6, 'total' => 6, 'score' => 91.2, 'href' => '/praktikan/grade'],
                ['id' => 'cp-4', 'course' => 'Mobile Programming', 'className' => 'Kelas A', 'submitted' => 2, 'total' => 6, 'score' => null, 'href' => '/praktikan/grade'],
            ],
            // FR-PD-5: 3 nilai terakhir yang dipublikasikan.
            'recentFeedback' => [
                ['id' => 'fb-1', 'task' => 'Post-Test Modul 03', 'course' => 'Machine Learning', 'score' => 90, 'maxScore' => 100, 'excerpt' => 'Struktur kode rapi. Perhatikan normalisasi fitur sebelum training.', 'grader' => 'Dimas Asisten', 'gradedAt' => $now->subHours(3)->toIso8601String(), 'href' => '/praktikan/grade'],
                ['id' => 'fb-2', 'task' => 'Laporan Modul 02', 'course' => 'Deep Learning', 'score' => 78, 'maxScore' => 100, 'excerpt' => 'Analisis loss curve kurang mendalam; tambahkan perbandingan learning rate.', 'grader' => 'Yozika Arvio', 'gradedAt' => $now->subDays(2)->toIso8601String(), 'href' => '/praktikan/grade'],
                ['id' => 'fb-3', 'task' => 'Pre-Test Modul 04', 'course' => 'Information Retrieval', 'score' => 95, 'maxScore' => 100, 'excerpt' => 'Implementasi TF-IDF tepat dan efisien.', 'grader' => 'Daniswara A.', 'gradedAt' => $now->subDays(4)->toIso8601String(), 'href' => '/praktikan/grade'],
            ],
            // FR-PD-6: global & per kelas, yang di-pin di atas.
            'announcements' => [
                ['id' => 'an-1', 'title' => 'Lab tutup Jumat, 9 Okt (maintenance jaringan)', 'body' => 'Praktikum hari Jumat dipindah ke Sabtu pagi. Cek jadwal terbaru di menu Schedule.', 'scope' => 'global', 'className' => null, 'pinned' => true, 'publishedAt' => $now->subDay()->toIso8601String()],
                ['id' => 'an-2', 'title' => 'Modul 05 sudah dapat diunduh', 'body' => 'Silakan pelajari sebelum pre-test minggu depan.', 'scope' => 'class', 'className' => 'Information Retrieval · Kelas A', 'pinned' => false, 'publishedAt' => $now->subHours(6)->toIso8601String()],
            ],
        ];
    }

    /**
     * Praktikan yang belum tergabung ke kelas mana pun (FR-PD: empty state).
     *
     * @return array<string, mixed>
     */
    private static function empty(CarbonImmutable $weekStart, CarbonImmutable $now): array
    {
        return [
            'isSample' => true,
            'hasClasses' => false,
            'nextClass' => null,
            'pendingTasks' => 0,
            'openProgram' => null,
            'week' => ['start' => $weekStart->toDateString(), 'today' => $now->dayOfWeekIso, 'events' => []],
            'upcomingTasks' => [],
            'courseProgress' => [],
            'recentFeedback' => [],
            'announcements' => [],
        ];
    }

    /**
     * FR-PD-3: maks. 5 tugas terbuka dengan tenggat terdekat + jumlah yang belum
     * dikumpulkan (tugas terbuka, termasuk yang menerima keterlambatan).
     *
     * @return array{0: list<array<string, mixed>>, 1: int}
     */
    private static function tasks(User $user, CarbonImmutable $now): array
    {
        $targets = TaskTarget::query()
            ->whereNotNull('open_at')->where('open_at', '<=', $now)
            ->whereHas('task', fn ($q) => $q->where('status', 'published')->where('semester_id', Semester::current()?->id))
            ->whereHas('labClass.enrollments', fn ($q) => $q->where('user_id', $user->id))
            ->with(['task.course', 'submissions' => fn ($q) => $q->where('user_id', $user->id)->where('is_current', true)])
            ->get()
            ->filter(fn (TaskTarget $target) => $target->state($now) === 'open');

        $pending = $targets->filter(fn (TaskTarget $target) => $target->submissions->isEmpty())->count();

        $upcoming = $targets
            ->filter(fn (TaskTarget $target) => $target->due_at && $target->due_at->isAfter($now))
            ->sortBy('due_at')
            ->take(5)
            ->map(function (TaskTarget $target) {
                $current = $target->submissions->first();

                return [
                    'id' => "tk-{$target->id}",
                    'title' => $target->task->title,
                    'course' => $target->task->course->name,
                    'type' => $target->task->type->value,
                    'dueAt' => $target->due_at->toIso8601String(),
                    'status' => $current ? ($current->is_late ? 'late' : 'submitted') : 'not_submitted',
                    'href' => '/praktikan/tasks/'.$target->id,
                ];
            })
            ->values()
            ->all();

        return [$upcoming, $pending];
    }

    /**
     * Kelas (disetujui) yang diikuti praktikan pada semester aktif.
     *
     * @return Collection<int, LabClass>
     */
    private static function enrolledClasses(User $user): Collection
    {
        $semester = Semester::current();

        return $semester
            ? LabClass::forSemester($semester)
                ->where('approval_status', ApprovalStatus::Approved)
                ->whereHas('enrollments', fn ($query) => $query->where('user_id', $user->id))
                ->with(['course', 'room', 'assistants'])
                ->get()
            : new Collection;
    }

    /**
     * @param  Collection<int, LabClass>  $classes
     * @return list<array<string, mixed>>
     */
    private static function weekEvents(Collection $classes, CarbonImmutable $weekStart, CarbonImmutable $now): array
    {
        return $classes->map(function (LabClass $class) use ($weekStart, $now) {
            [$startsAt, $endsAt] = self::bounds($weekStart, $class->day_of_week, $class->startClock(), $class->endClock());

            return [
                'id' => "class-{$class->id}",
                'type' => 'class',
                'title' => $class->course->name,
                'subtitle' => $class->name,
                'room' => $class->room->name,
                'day' => $class->day_of_week,
                'start' => $class->startClock(),
                'end' => $class->endClock(),
                'color' => CourseColor::for($class->course_id),
                'running' => $now->betweenIncluded($startsAt, $endsAt),
            ];
        })->values()->all();
    }

    /**
     * FR-PD-2: kelas berikutnya (atau yang sedang berjalan), minggu ini atau minggu depan.
     *
     * @param  Collection<int, LabClass>  $classes
     * @return array<string, mixed>|null
     */
    private static function nextClass(Collection $classes, CarbonImmutable $weekStart, CarbonImmutable $now): ?array
    {
        return collect([$weekStart, $weekStart->addWeek()])
            ->flatMap(fn (CarbonImmutable $week) => $classes->map(function (LabClass $class) use ($week) {
                [$startsAt, $endsAt] = self::bounds($week, $class->day_of_week, $class->startClock(), $class->endClock());

                return [
                    'course' => $class->course->name,
                    'className' => $class->name,
                    // Diisi modul Pertemuan & Modul.
                    'module' => null,
                    'room' => $class->room->name,
                    'assistant' => $class->assistants->pluck('name')->join(', ') ?: '—',
                    // Diisi modul Seats.
                    'seat' => null,
                    'startsAt' => $startsAt,
                    'endsAt' => $endsAt,
                ];
            }))
            ->filter(fn (array $class) => $class['endsAt']->isAfter($now))
            ->sortBy('startsAt')
            ->map(fn (array $class) => [
                ...$class,
                'startsAt' => $class['startsAt']->toIso8601String(),
                'endsAt' => $class['endsAt']->toIso8601String(),
            ])
            ->first();
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    private static function bounds(CarbonImmutable $weekStart, int $day, string $start, string $end): array
    {
        $date = $weekStart->addDays($day - 1);

        return [$date->setTimeFromTimeString($start), $date->setTimeFromTimeString($end)];
    }
}
