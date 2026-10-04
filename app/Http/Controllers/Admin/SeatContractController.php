<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Seat\CorrectSeatContract;
use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\LabClass;
use App\Models\SeatContract;
use App\Models\Semester;
use App\Support\Seats\SeatMapData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin › Kontrak Kursi (FR-ADM-06, US-D03).
 */
class SeatContractController extends Controller
{
    public function index(Request $request): Response
    {
        $semester = Semester::current();
        $classes = $semester
            ? LabClass::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)
                ->with(['course', 'room', 'assistants'])->withCount(['seatContracts', 'enrollments'])
                ->orderBy('course_id')->orderBy('name')->get()
            : collect();

        $class = $classes->firstWhere('id', $request->integer('class')) ?? $classes->first();

        return Inertia::render('admin/seat-contracts', [
            'classes' => $classes->map(fn (LabClass $c) => [
                'id' => $c->id,
                'label' => "{$c->course->name} ({$c->name})",
                'contracted' => $c->seat_contracts_count,
                'members' => $c->enrollments_count,
            ])->values(),
            'selected' => $class ? [
                ...SeatMapData::classSummary($class),
                'contracted' => $class->seat_contracts_count,
                'members' => $class->enrollments_count,
            ] : null,
            'map' => $class ? SeatMapData::for($class, withDetail: true) : null,
        ]);
    }

    public function update(Request $request, SeatContract $contract, CorrectSeatContract $correct): RedirectResponse
    {
        $validated = $request->validate([
            'seat_id' => ['required', 'integer'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ], [], ['reason' => 'alasan']);

        $correct->move($contract, (int) $validated['seat_id'], $validated['reason']);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Kontrak {$contract->snapshot_name} dipindahkan ke {$contract->fresh('seat')->seat->label}."]);

        return back();
    }

    public function destroy(Request $request, SeatContract $contract, CorrectSeatContract $correct): RedirectResponse
    {
        $validated = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:500']], [], ['reason' => 'alasan']);

        $correct->cancel($contract, $validated['reason']);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Kontrak kursi {$contract->snapshot_name} dibatalkan."]);

        return back();
    }
}
