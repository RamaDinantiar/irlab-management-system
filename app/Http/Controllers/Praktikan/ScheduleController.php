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
 * Praktikan › Schedule (FR-PS): matriks mingguan + daftar pertemuan & modul.
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
                ->with(['course', 'room', 'assistants', 'meetings.moduleFile', 'meetings.responsibleAssistant'])
                ->orderBy('day_of_week')->orderBy('start_time')
                ->get()
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
                    'color' => CourseColor::for($class->course_id),
                    'running' => $now->dayOfWeekIso === $class->day_of_week
                        && $now->format('H:i') >= $class->startClock() && $now->format('H:i') <= $class->endClock(),
                ])->values(),
            ],
            'classes' => $classes->map(fn (LabClass $class) => [
                'id' => $class->id,
                'course' => $class->course->name,
                'name' => $class->name,
                'dayOfWeek' => $class->day_of_week,
                'startTime' => $class->startClock(),
                'endTime' => $class->endClock(),
                'room' => $class->room->name,
                'color' => CourseColor::for($class->course_id),
                'meetings' => $class->meetings->map(fn (Meeting $meeting) => [
                    'id' => $meeting->id,
                    'number' => $meeting->number,
                    'date' => $meeting->date->toDateString(),
                    'moduleTitle' => $meeting->module_title,
                    'assistant' => $meeting->responsibleAssistant?->name ?? $class->assistants->pluck('name')->join(', '),
                    // FR-PS-03: hanya modul yang sudah dirilis.
                    'module' => $meeting->isModuleReleased() ? $meeting->moduleFile?->toClient() : null,
                    'moduleReleaseAt' => $meeting->module_file_id && ! $meeting->isModuleReleased()
                        ? $meeting->module_release_at?->toIso8601String()
                        : null,
                ])->values(),
            ])->values(),
        ]);
    }
}
