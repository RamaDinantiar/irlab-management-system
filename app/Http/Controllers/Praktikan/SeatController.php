<?php

namespace App\Http\Controllers\Praktikan;

use App\Actions\Seat\ContractSeat;
use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\LabClass;
use App\Models\SeatContract;
use App\Models\Semester;
use App\Support\Seats\SeatMapData;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Praktikan › Seats (FR-PST, US-P04).
 */
class SeatController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $classes = $this->classes($request);
        $contracts = SeatContract::where('user_id', $user->id)->whereIn('class_id', $classes->pluck('id'))->with('seat')->get()->keyBy('class_id');

        $selected = $classes->firstWhere('id', $request->integer('class'))
            ?? $classes->first(fn (LabClass $class) => $contracts->has($class->id))
            ?? $classes->first();

        return Inertia::render('praktikan/seats/index', [
            'classes' => $classes->map(fn (LabClass $class) => [
                ...SeatMapData::classSummary($class),
                'seat' => $contracts->get($class->id)?->seat->label,
            ])->values(),
            'selectedId' => $selected?->id,
            'map' => $selected ? SeatMapData::for($selected, $user) : null,
        ]);
    }

    /**
     * Formulir kontrak (Figma "Formulir Kontrak Tempat Duduk").
     */
    public function create(Request $request, LabClass $class): Response|RedirectResponse
    {
        $user = $request->user();
        abort_unless($this->classes($request)->contains('id', $class->id), 404);

        if ($class->seatContracts()->where('user_id', $user->id)->exists()) {
            return to_route('praktikan.seats.index', ['class' => $class->id]);
        }

        $map = SeatMapData::for($class, $user);
        $seats = collect($map['layout']['cells'] ?? [])->where('type', 'seat')->count();

        return Inertia::render('praktikan/seats/contract', [
            'class' => SeatMapData::classSummary($class),
            'options' => $this->classes($request)
                ->reject(fn (LabClass $c) => $c->seatContracts()->where('user_id', $user->id)->exists())
                ->map(fn (LabClass $c) => ['id' => $c->id, 'label' => "{$c->course->name} - {$c->name}"])->values(),
            'profile' => ['name' => $user->name, 'nim' => $user->nim, 'major' => $user->major, 'email' => $user->email],
            'map' => $map,
            'capacity' => ['total' => $seats, 'available' => $seats - count($map['occupants'] ?? [])],
        ]);
    }

    public function store(Request $request, LabClass $class, ContractSeat $contract): RedirectResponse
    {
        $validated = $request->validate([
            'seat_id' => ['required', 'integer'],
            'agreement' => ['accepted'],
        ], ['agreement.accepted' => 'Centang pernyataan persetujuan terlebih dahulu.']);

        $seat = $contract($request->user(), $class, (int) $validated['seat_id']);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Kursi {$seat->seat->label} terkunci untuk {$class->name} selama semester ini."]);

        return to_route('praktikan.seats.index', ['class' => $class->id]);
    }

    /**
     * @return Collection<int, LabClass>
     */
    private function classes(Request $request): Collection
    {
        $semester = Semester::current();

        return $semester
            ? LabClass::forSemester($semester)
                ->where('approval_status', ApprovalStatus::Approved)
                ->whereHas('enrollments', fn ($q) => $q->where('user_id', $request->user()->id))
                ->with(['course', 'room', 'assistants'])
                ->orderBy('day_of_week')->orderBy('start_time')
                ->get()
            : new Collection;
    }
}
