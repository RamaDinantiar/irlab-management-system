<?php

namespace App\Support\Dashboard;

use App\Enums\ApprovalStatus;
use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\LabClass;
use App\Models\Program;
use App\Models\Semester;
use App\Models\Shift;
use App\Models\SupervisionReport;
use App\Models\User;
use App\Support\ClassDays;
use App\Support\Grading\GradingQueue;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/**
 * Data Dashboard Admin (PRD FR-ADM-01). Kontrak bentuk data ini dipakai halaman
 * React `admin/dashboard` — lihat resources/js/types/dashboard.ts.
 *
 * Seluruh bagian sudah memakai data asli (sumber per bagian):
 *  - semester                        → ✅ data asli (modul Semester)
 *  - counts.courses                  → ✅ data asli (modul Mata Kuliah)
 *  - counts.classes                  → ✅ data asli (modul Kelas)
 *  - counts (lainnya)                → ✅ data asli (Pengguna)
 *  - approvals                       → ✅ data asli (Mata Kuliah & Kelas)
 *  - reportCompliance                → ✅ data asli (Report Ngawas)
 *  - gradingQueue                    → ✅ data asli (modul Grade)
 *  - activePrograms                  → ✅ data asli (Program)
 *  - auditLogs                       → ✅ data asli (Audit Log)
 * `isSample` dipertahankan (false) agar kontrak tipe frontend tetap stabil.
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
    public static function for(?CarbonImmutable $now = null, ?User $admin = null): array
    {
        $now ??= CarbonImmutable::now();

        $active = Semester::current();

        return [
            'isSample' => false,
            'semester' => self::semester($active, $now),
            'counts' => [
                'praktikan' => User::where('role', Role::Praktikan)->where('is_active', true)->count(),
                'asisten' => User::where('role', Role::Asisten)->where('is_active', true)->count(),
                'classes' => $active ? LabClass::forSemester($active)->where('approval_status', ApprovalStatus::Approved)->count() : 0,
                'courses' => $active ? Course::forSemester($active)->where('approval_status', ApprovalStatus::Approved)->count() : 0,
            ],
            // KPI PRD Bagian 1: laporan ngawas tercatat di hari yang sama ≥ 90%.
            'reportCompliance' => self::compliance($now),
            'approvals' => $active ? self::approvals($active) : [],
            'gradingQueue' => $admin ? GradingQueue::for($admin) : [],
            'activePrograms' => Program::whereIn('status', ['open', 'closed'])->where('type', '!=', 'maintenance')
                ->withCount(['registrations' => fn ($q) => $q->where('status', '!=', 'cancelled')])->with('stages')
                ->orderByRaw("CASE status WHEN 'open' THEN 0 ELSE 1 END")->latest('starts_at')->limit(4)->get()
                ->map(fn (Program $p) => [
                    'id' => "pg-{$p->id}",
                    'type' => $p->type->label(),
                    'title' => $p->title,
                    'status' => Program::STATUS_LABELS[$p->status],
                    'registered' => $p->registrations_count,
                    'quota' => $p->quota,
                    'href' => '/asisten/programs/'.$p->id,
                ])->values()->all(),
            'auditLogs' => AuditLog::with('user:id,name')->latest('id')->limit(5)->get()->map(fn (AuditLog $log) => [
                'id' => "au-{$log->id}",
                'actor' => $log->user?->name ?? 'Sistem',
                'action' => str_replace(['.', '_'], ' ', $log->action),
                'target' => $log->auditable_type ? Str::headline(class_basename($log->auditable_type)).' #'.$log->auditable_id : '—',
                'at' => $log->created_at->toIso8601String(),
            ])->values()->all(),
        ];
    }

    /**
     * KPI PRD Bagian 1: laporan ngawas bulan ini — sesi yang seharusnya
     * dilaporkan (sesi kelas unik + shift jaga lab yang sudah lewat), yang
     * sudah dilaporkan, dan yang dibuat di hari yang sama dengan shift.
     *
     * @return array{month: string, onTime: int, submitted: int, expected: int, target: int}
     */
    private static function compliance(CarbonImmutable $now): array
    {
        $range = [$now->startOfMonth()->toDateString(), $now->subDay()->toDateString()];
        $shifts = Shift::whereDateBetween('date', $range)->get(['class_id', 'user_id', 'date']);
        $expected = $shifts->map(fn (Shift $s) => $s->class_id ? "c{$s->class_id}@{$s->date->toDateString()}" : "u{$s->user_id}@{$s->date->toDateString()}")->unique()->count();

        $reports = SupervisionReport::whereDateBetween('date', $range)->where('status', '!=', 'draft')->get(['date', 'created_at']);

        return [
            'month' => $now->locale('id')->translatedFormat('F Y'),
            'onTime' => $reports->filter(fn (SupervisionReport $r) => $r->created_at->isSameDay($r->date))->count(),
            'submitted' => $reports->count(),
            'expected' => max($expected, $reports->count()),
            'target' => 90,
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
