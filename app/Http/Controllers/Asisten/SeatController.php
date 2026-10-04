<?php

namespace App\Http\Controllers\Asisten;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\LabClass;
use App\Models\Semester;
use App\Support\Seats\SeatMapData;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Asisten › Seats — "Seat Mapping" (read-only; koreksi oleh Admin, US-D03).
 */
class SeatController extends Controller
{
    public function index(Request $request): Response
    {
        $semester = Semester::current();
        $classes = $semester
            ? LabClass::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)->taughtBy($request->user())
                ->with(['course', 'room', 'assistants'])->withCount(['seatContracts', 'enrollments'])
                ->orderBy('course_id')->orderBy('name')->get()
            : collect();

        $class = $classes->firstWhere('id', $request->integer('class')) ?? $classes->first();

        return Inertia::render('asisten/seats', [
            'classes' => $classes->map(fn (LabClass $c) => ['id' => $c->id, 'label' => "{$c->course->name} ({$c->name})"])->values(),
            'selected' => $class ? [
                ...SeatMapData::classSummary($class),
                'contracted' => $class->seat_contracts_count,
                'members' => $class->enrollments_count,
            ] : null,
            'map' => $class ? SeatMapData::for($class, withDetail: true) : null,
        ]);
    }
}
