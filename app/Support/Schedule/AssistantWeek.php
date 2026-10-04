<?php

namespace App\Support\Schedule;

use App\Enums\ApprovalStatus;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\Shift;
use App\Models\User;
use App\Support\CourseColor;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

/**
 * Agenda mingguan asisten (FR-AS-01, FR-AD-5): shift miliknya (sesi kelas &
 * jaga lab) + sesi kelas yang diampu yang belum punya shift sama sekali.
 */
class AssistantWeek
{
    /**
     * @return list<array<string, mixed>>
     */
    public static function events(User $user, CarbonImmutable $weekStart, CarbonImmutable $now): array
    {
        $weekEnd = $weekStart->addDays(6);
        $shifts = Shift::where('user_id', $user->id)->whereDateBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])
            ->with(['labClass.course', 'room'])->get();

        $events = $shifts->map(fn (Shift $shift) => self::fromShift($shift, $now));

        $semester = Semester::current();
        if ($semester) {
            $covered = Shift::whereDateBetween('date', [$weekStart->toDateString(), $weekEnd->toDateString()])->whereNotNull('class_id')
                ->get(['class_id', 'date'])->map(fn ($s) => $s->class_id.'@'.$s->date->toDateString())->all();

            LabClass::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)
                ->whereHas('assistants', fn ($q) => $q->whereKey($user->id))->with(['course', 'room'])->get()
                ->each(function (LabClass $class) use ($weekStart, $covered, $now, &$events) {
                    $date = $weekStart->addDays($class->day_of_week - 1);
                    if (in_array($class->id.'@'.$date->toDateString(), $covered, true)) {
                        return;
                    }

                    $events->push(self::event("class-{$class->id}", 'class', $class->course->name, $class->name, $class->room?->name ?? '—', $date, $class->startClock(), $class->endClock(), CourseColor::for($class->course_id), $now));
                });
        }

        return $events->sortBy(fn ($e) => [$e['day'], $e['start']])->values()->all();
    }

    /**
     * Shift berikutnya milik user (untuk kartu dashboard).
     *
     * @return array{title: string, room: string, startsAt: string, endsAt: string}|null
     */
    public static function nextShift(User $user, CarbonImmutable $now): ?array
    {
        $shift = Shift::where('user_id', $user->id)->whereDate('date', '>=', $now->toDateString())
            ->with(['labClass.course', 'room'])->orderBy('date')->orderBy('start_time')->get()
            ->first(fn (Shift $s) => $s->endsAt()->isAfter($now));

        return $shift ? [
            'title' => $shift->displayTitle(),
            'room' => $shift->room?->name ?? '—',
            'startsAt' => $shift->startsAt()->toIso8601String(),
            'endsAt' => $shift->endsAt()->toIso8601String(),
        ] : null;
    }

    /**
     * @return array<string, mixed>
     */
    public static function fromShift(Shift $shift, CarbonImmutable $now): array
    {
        $class = $shift->labClass;

        return self::event(
            "shift-{$shift->id}",
            $class ? 'class' : 'shift',
            $class ? $class->course->name : ($shift->title ?? 'Jaga Lab'),
            $class ? $class->name : 'Shift mengawas',
            $shift->room?->name ?? '—',
            CarbonImmutable::parse($shift->date),
            $shift->startClock(),
            $shift->endClock(),
            $class ? CourseColor::for($class->course_id) : 'teal',
            $now,
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function event(string $id, string $type, string $title, string $subtitle, string $room, CarbonImmutable $date, string $start, string $end, string $color, CarbonImmutable $now): array
    {
        return [
            'id' => $id,
            'type' => $type,
            'title' => $title,
            'subtitle' => $subtitle,
            'room' => $room,
            'day' => $date->dayOfWeekIso,
            'start' => $start,
            'end' => $end,
            'color' => $color,
            'running' => $now->betweenIncluded($date->setTimeFromTimeString($start), $date->setTimeFromTimeString($end)),
        ];
    }

    /**
     * Asisten yang bisa menerima tukar shift (aktif, tidak bentrok).
     *
     * @return Collection<int, array{id: int, name: string}>
     */
    public static function swapCandidates(Shift $shift): Collection
    {
        return User::where('role', 'asisten')->where('is_active', true)->whereKeyNot($shift->user_id)->orderBy('name')->get(['id', 'name'])
            ->reject(fn (User $u) => Shift::overlaps($u->id, $shift->date->toDateString(), $shift->start_time, $shift->end_time))
            ->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name])
            ->values();
    }
}
