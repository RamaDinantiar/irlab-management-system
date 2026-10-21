<?php

namespace App\Support\Dashboard;

use App\Models\Enrollment;
use App\Models\HonorRecap;
use App\Models\LabClass;
use App\Models\ProgramRegistration;
use App\Models\Shift;
use App\Models\ShiftSwap;
use App\Models\Submission;
use App\Models\SupervisionReport;
use App\Models\TaskTarget;
use App\Models\User;
use App\Support\Grading\GradingQueue;
use App\Support\Schedule\AssistantWeek;
use Carbon\CarbonImmutable;

/**
 * Data Dashboard Asisten (PRD FR-AD). Kontrak bentuk data ini dipakai halaman
 * React `asisten/dashboard` — lihat resources/js/types/dashboard.ts.
 *
 * Seluruh bagian sudah memakai data asli (sumber per bagian):
 *  - pendingReports, nextShift, week (shift)  → ✅ data asli (Report & Shift)
 *  - pendingGrading, gradingQueue              → ✅ data asli (modul Grade)
 *  - week (sesi kelas)                         → ✅ data asli (modul Kelas & Jadwal)
 *  - alerts                                    → ✅ data asli
 *  - activities                                → ✅ data asli (Submission, Enrollment, Program)
 * `isSample` dipertahankan (false) agar kontrak tipe frontend tetap stabil.
 */
class AsistenDashboardData
{
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

        $events = AssistantWeek::events($user, $weekStart, $now);

        return [
            'isSample' => false,
            'pendingReports' => Shift::where('user_id', $user->id)->whereDate('date', '<=', $now->toDateString())
                ->whereDate('date', '>=', $now->subDays(7)->toDateString())->unreported()->get()
                ->filter(fn (Shift $s) => $s->endsAt()->isPast())->count(),
            'pendingGrading' => $pendingGrading,
            'nextShift' => AssistantWeek::nextShift($user, $now),
            'alerts' => self::alerts($user),
            'week' => [
                'start' => $weekStart->toDateString(),
                'today' => $now->dayOfWeekIso,
                'events' => $events,
            ],
            'gradingQueue' => $gradingQueue,
            'activities' => self::activities($user),
        ];
    }

    /**
     * Aktivitas terbaru di kelas yang diampu: submission & praktikan bergabung.
     *
     * @return array<int, array{id: string, type: string, message: string, at: string}>
     */
    private static function activities(User $user): array
    {
        $classIds = LabClass::taughtBy($user)->whereHas('semester', fn ($q) => $q->where('status', 'active'))->select('id');

        $submissions = Submission::where('is_current', true)
            ->whereHas('target', fn ($q) => $q->whereIn('class_id', $classIds))
            ->with(['user:id,name', 'target.task:id,title', 'target.labClass.course'])
            ->latest('submitted_at')->limit(6)->get()
            ->map(fn (Submission $s) => [
                'id' => "sub-{$s->id}",
                'type' => 'submission',
                'message' => "{$s->user->name} mengumpulkan {$s->target->task->title} ({$s->target->labClass->course->name} · {$s->target->labClass->name})".($s->is_late ? ' — terlambat' : ''),
                'at' => $s->submitted_at->toIso8601String(),
            ]);

        $enrollments = Enrollment::whereIn('class_id', $classIds)->with(['user:id,name', 'labClass.course'])->latest('joined_at')->limit(4)->get()
            ->map(fn (Enrollment $e) => [
                'id' => "enr-{$e->id}",
                'type' => 'enrollment',
                'message' => "{$e->user->name} bergabung ke {$e->labClass->course->name} · {$e->labClass->name}",
                'at' => $e->joined_at->toIso8601String(),
            ]);

        $programs = ! config('lab.features.programs') ? collect() : ProgramRegistration::with(['user:id,name', 'program:id,title'])->latest()->limit(3)->get()
            ->map(fn (ProgramRegistration $r) => [
                'id' => "prg-{$r->id}",
                'type' => 'program',
                'message' => "{$r->user->name} mendaftar {$r->program->title}",
                'at' => $r->created_at->toIso8601String(),
            ]);

        return $submissions->concat($enrollments)->concat($programs)->sortByDesc('at')->take(6)->values()->all();
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
            ['key' => 'shift-swaps', 'label' => 'permintaan tukar shift', 'count' => ShiftSwap::where('to_user_id', $user->id)->where('status', 'pending')->count(), 'href' => '/asisten/schedule', 'tone' => 'info'],
        ];

        if ($user->canVerifyReports()) {
            $alerts[] = ['key' => 'to-verify', 'label' => 'laporan ngawas menunggu verifikasi', 'count' => SupervisionReport::where('status', 'submitted')->where('user_id', '!=', $user->id)->count(), 'href' => '/asisten/report?tab=verify', 'tone' => 'warning'];
        }

        if ($user->canApproveHonor()) {
            $alerts[] = ['key' => 'honor', 'label' => 'rekap honor menunggu persetujuan', 'count' => HonorRecap::where('status', 'draft')->distinct()->count('month'), 'href' => '/asisten/generate?scope=all', 'tone' => 'warning'];
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
}
