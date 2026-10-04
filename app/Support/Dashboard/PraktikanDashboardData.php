<?php

namespace App\Support\Dashboard;

use App\Enums\ApprovalStatus;
use App\Models\Grade;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Semester;
use App\Models\TaskTarget;
use App\Models\User;
use App\Support\CourseColor;
use App\Support\Grading\FinalScore;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data Dashboard Praktikan (PRD FR-PD). Kontrak bentuk data ini dipakai halaman
 * React `praktikan/dashboard` — lihat resources/js/types/dashboard.ts.
 *
 * SEMENTARA BERISI DATA CONTOH. Ganti tiap bagian dengan query asli begitu
 * modulnya dibangun, tanpa mengubah bentuk array yang dikembalikan:
 *  - hasClasses, week, nextClass        → ✅ data asli (Kelas & Enrollment)
 *  - nextClass.module, nextClass.seat   → ✅ data asli (Pertemuan, Seats)
 *  - pendingTasks, upcomingTasks        → ✅ data asli (Task & Submission)
 *  - courseProgress, recentFeedback     → ✅ data asli (Grade)
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
            'courseProgress' => self::courseProgress($user, $classes, $now),
            // FR-PD-5: 3 nilai terakhir yang dipublikasikan.
            'recentFeedback' => self::recentFeedback($user),
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
     * FR-PD-4: progres per mata kuliah — tugas terkumpul / tugas yang sudah
     * dibuka + nilai akhir sementara dari nilai terpublikasi (A6).
     *
     * @param  Collection<int, LabClass>  $classes
     * @return list<array<string, mixed>>
     */
    private static function courseProgress(User $user, Collection $classes, CarbonImmutable $now): array
    {
        $targets = TaskTarget::whereIn('class_id', $classes->pluck('id'))
            ->whereNotNull('open_at')->where('open_at', '<=', $now)
            ->whereHas('task', fn ($q) => $q->where('status', 'published'))
            ->withExists(['submissions as submitted' => fn ($q) => $q->where('user_id', $user->id)->where('is_current', true)])
            ->get()
            ->groupBy('class_id');

        $grades = Grade::where('status', 'published')
            ->whereHas('submission', fn ($q) => $q->where('user_id', $user->id)->where('is_current', true))
            ->with('submission.target.task')
            ->get()
            ->groupBy('submission.target.class_id');

        return $classes->map(function (LabClass $class) use ($targets, $grades) {
            $mine = $targets->get($class->id, collect());

            return [
                'id' => "cp-{$class->id}",
                'course' => $class->course->name,
                'className' => $class->name,
                'submitted' => $mine->where('submitted', true)->count(),
                'total' => $mine->count(),
                'score' => FinalScore::compute($class->course, $grades->get($class->id, []))['final'],
                'href' => '/praktikan/grade?class='.$class->id,
            ];
        })->values()->all();
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function recentFeedback(User $user): array
    {
        return Grade::where('status', 'published')
            ->whereHas('submission', fn ($q) => $q->where('user_id', $user->id)->where('is_current', true))
            ->with(['submission.target.task.course', 'grader'])
            ->latest('published_at')
            ->take(3)
            ->get()
            ->map(fn (Grade $grade) => [
                'id' => "fb-{$grade->id}",
                'task' => $grade->submission->target->task->title,
                'course' => $grade->submission->target->task->course->name,
                'score' => (float) $grade->score,
                'maxScore' => $grade->submission->target->task->max_score,
                'excerpt' => str($grade->feedback ?? 'Tidak ada catatan.')->replaceMatches('/```[\s\S]*?```/', '[kode]')->squish()->limit(120)->toString(),
                'grader' => $grade->grader?->name ?? 'Asisten',
                'gradedAt' => $grade->published_at->toIso8601String(),
                'href' => '/praktikan/grade?class='.$grade->submission->target->class_id,
            ])
            ->all();
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
                ->with([
                    'course', 'room', 'assistants',
                    'seatContracts' => fn ($query) => $query->where('user_id', $user->id)->with('seat'),
                    'meetings' => fn ($query) => $query->whereDateBetween('date', [now()->startOfWeek()->subDay(), now()->addWeeks(2)]),
                ])
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
                    'module' => $class->meetings->first(fn (Meeting $m) => $m->date->isSameDay($startsAt))?->module_title,
                    'room' => $class->room->name,
                    'assistant' => $class->assistants->pluck('name')->join(', ') ?: '—',
                    'seat' => $class->seatContracts->first()?->seat->label,
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
