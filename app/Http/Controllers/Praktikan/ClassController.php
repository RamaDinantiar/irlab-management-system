<?php

namespace App\Http\Controllers\Praktikan;

use App\Http\Controllers\Controller;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Praktikan › Class: kelas yang diikuti pada semester aktif + Gabung Kelas.
 */
class ClassController extends Controller
{
    public function index(Request $request): Response
    {
        $semester = Semester::current();

        $classes = $semester
            ? LabClass::forSemester($semester)
                ->whereHas('enrollments', fn ($query) => $query->where('user_id', $request->user()->id))
                ->with(['course', 'room', 'assistants'])
                ->withCount('enrollments')
                ->orderBy('day_of_week')->orderBy('start_time')
                ->get()
            : collect();

        return Inertia::render('praktikan/class/index', [
            'semester' => $semester?->only(['id', 'name']),
            // Tanpa token: praktikan tidak perlu (dan tidak boleh membagikan ulang) token kelas.
            'classes' => $classes->map(fn (LabClass $class) => [
                'id' => $class->id,
                'course' => ['code' => $class->course->code, 'name' => $class->course->name],
                'name' => $class->name,
                'dayOfWeek' => $class->day_of_week,
                'startTime' => $class->startClock(),
                'endTime' => $class->endClock(),
                'room' => $class->room->name,
                'assistants' => $class->assistants->map(fn (User $u) => $u->name)->values(),
                'membersCount' => $class->enrollments_count,
                'quota' => $class->quota,
            ]),
        ]);
    }
}
