<?php

namespace App\Http\Controllers\Asisten;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\LabClass;
use App\Models\Room;
use App\Models\Semester;
use App\Models\Shift;
use App\Models\ShiftSwap;
use App\Models\User;
use App\Support\CourseColor;
use App\Support\Schedule\AssistantWeek;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Asisten › Schedule (FR-AS-01/03/04): "Jadwal Saya" (kalender mingguan),
 * "Semua Jadwal" (seluruh kelas per hari + siapa bertugas), tukar shift.
 */
class ScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $now = CarbonImmutable::now();
        $weekStart = ($request->date('week') ? CarbonImmutable::parse($request->date('week')) : $now)->startOfWeek(CarbonImmutable::MONDAY);
        $semester = Semester::current();

        $classes = $semester
            ? LabClass::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)
                ->with(['course', 'room', 'assistants'])->orderBy('day_of_week')->orderBy('start_time')->get()
            : collect();

        $myShifts = Shift::where('user_id', $user->id)->whereDate('date', '>=', $now->toDateString())
            ->with(['labClass.course', 'room', 'swaps' => fn ($q) => $q->where('status', 'pending')])
            ->orderBy('date')->orderBy('start_time')->limit(40)->get();

        $swapRow = fn (ShiftSwap $swap) => [
            'id' => $swap->id,
            'status' => $swap->status,
            'reason' => $swap->reason,
            'responseNote' => $swap->response_note,
            'from' => $swap->fromUser->name,
            'to' => $swap->toUser->name,
            'shift' => [
                'title' => $swap->shift->displayTitle(),
                'date' => $swap->shift->date->toDateString(),
                'start' => $swap->shift->startClock(),
                'end' => $swap->shift->endClock(),
                'room' => $swap->shift->room?->name,
            ],
            'createdAt' => $swap->created_at->toIso8601String(),
            'respondedAt' => $swap->responded_at?->toIso8601String(),
        ];

        $swaps = ShiftSwap::where(fn ($q) => $q->where('from_user_id', $user->id)->orWhere('to_user_id', $user->id))
            ->with(['shift.labClass.course', 'shift.room', 'fromUser:id,name', 'toUser:id,name'])->latest()->limit(30)->get();

        return Inertia::render('asisten/schedule', [
            'week' => [
                'start' => $weekStart->toDateString(),
                'today' => $weekStart->isSameWeek($now) ? $now->dayOfWeekIso : 0,
                'events' => AssistantWeek::events($user, $weekStart, $now),
            ],
            'myClassCount' => $classes->filter(fn (LabClass $c) => $c->assistants->contains('id', $user->id))->count(),
            'allClasses' => $classes->map(fn (LabClass $c) => [
                'id' => $c->id,
                'course' => $c->course->name,
                'code' => $c->course->code,
                'credits' => $c->course->credits,
                'name' => $c->name,
                'dayOfWeek' => $c->day_of_week,
                'startTime' => $c->startClock(),
                'endTime' => $c->endClock(),
                'room' => $c->room->name,
                'assistants' => $c->assistants->pluck('name')->values(),
                'color' => CourseColor::for($c->course),
                'mine' => $c->assistants->contains('id', $user->id),
            ])->values(),
            'dutyThisWeek' => Shift::whereDateBetween('date', [$weekStart->toDateString(), $weekStart->addDays(6)->toDateString()])
                ->whereNull('class_id')->with(['user:id,name', 'room'])->orderBy('date')->orderBy('start_time')->get()
                ->map(fn (Shift $s) => ['id' => $s->id, 'user' => $s->user->name, 'title' => $s->title ?? 'Jaga Lab', 'date' => $s->date->toDateString(), 'start' => $s->startClock(), 'end' => $s->endClock(), 'room' => $s->room?->name])
                ->values(),
            'myShifts' => $myShifts->map(fn (Shift $s) => [
                'id' => $s->id,
                'title' => $s->displayTitle(),
                'date' => $s->date->toDateString(),
                'start' => $s->startClock(),
                'end' => $s->endClock(),
                'room' => $s->room?->name,
                'swappable' => $s->startsAt()->subDay()->isFuture() && $s->swaps->isEmpty(),
                'pendingSwap' => $s->swaps->isNotEmpty(),
            ])->values(),
            'incoming' => $swaps->where('to_user_id', $user->id)->where('status', 'pending')->map($swapRow)->values(),
            'history' => $swaps->reject(fn ($s) => $s->to_user_id === $user->id && $s->status === 'pending')->map($swapRow)->values(),
            // Admin: kelola shift (FR-AS-04 audit + override).
            'manage' => $user->isAdmin() ? [
                'assistants' => User::where('role', 'asisten')->where('is_active', true)->orderBy('name')->get(['id', 'name']),
                'rooms' => Room::orderBy('name')->get(['id', 'name']),
                'shiftCount' => $semester ? Shift::where('semester_id', $semester->id)->count() : 0,
            ] : null,
        ]);
    }
}
