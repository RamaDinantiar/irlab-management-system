<?php

namespace App\Http\Controllers\Praktikan;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Semester;
use App\Support\CourseColor;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Praktikan › Schedule (FR-PS): "Jadwal Saya" (matriks mingguan + daftar
 * pertemuan) dan "Semua Jadwal di Lab" (seluruh kelas aktif per hari).
 */
class ScheduleController extends Controller
{
    public function index(Request $request): Response
    {
        $semester = Semester::current();
        $now = CarbonImmutable::now();
        $weekStart = $now->startOfWeek(CarbonImmutable::MONDAY);

        $classes = $semester
            ? LabClass::forSemester($semester)
                ->where('approval_status', ApprovalStatus::Approved)
                ->whereHas('enrollments', fn ($q) => $q->where('user_id', $request->user()->id))
                ->with(['course', 'room', 'assistants', 'meetings.responsibleAssistant'])
                ->orderBy('day_of_week')->orderBy('start_time')
                ->get()
            : collect();

        // "Semua Jadwal di Lab": seluruh kelas aktif semester ini (Figma "Schedule").
        $allClasses = $semester
            ? LabClass::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)
                ->with(['course', 'room', 'assistants'])->orderBy('day_of_week')->orderBy('start_time')->get()
            : collect();

        return Inertia::render('praktikan/schedule', [
            'week' => [
                'start' => $weekStart->toDateString(),
                'today' => $now->dayOfWeekIso,
                'events' => $classes->map(fn (LabClass $class) => [
                    'id' => "class-{$class->id}",
                    'type' => 'class',
                    'title' => $class->course->name,
                    'subtitle' => $class->name,
                    'room' => $class->room->name,
                    'day' => $class->day_of_week,
                    'start' => $class->startClock(),
                    'end' => $class->endClock(),
                    'color' => CourseColor::for($class->course),
                    'running' => $now->dayOfWeekIso === $class->day_of_week
                        && $now->format('H:i') >= $class->startClock() && $now->format('H:i') <= $class->endClock(),
                ])->values(),
            ],
            'allClasses' => $allClasses->map(fn (LabClass $c) => [
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
                'mine' => $classes->contains('id', $c->id),
            ])->values(),
            'classes' => $classes->map(fn (LabClass $class) => [
                'id' => $class->id,
                'course' => $class->course->name,
                'name' => $class->name,
                'dayOfWeek' => $class->day_of_week,
                'startTime' => $class->startClock(),
                'endTime' => $class->endClock(),
                'room' => $class->room->name,
                'color' => CourseColor::for($class->course),
                'meetings' => $class->meetings->map(fn (Meeting $meeting) => [
                    'id' => $meeting->id,
                    'number' => $meeting->number,
                    'date' => $meeting->date->toDateString(),
                    'topic' => $meeting->topic,
                    'assistant' => $meeting->responsibleAssistant->name ?? $class->assistants->pluck('name')->join(', '),
                ])->values(),
            ])->values(),
        ]);
    }
}
