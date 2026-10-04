<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Seat\SaveRoomLayout;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Room;
use App\Models\SeatContract;
use App\Support\Seats\RoomLayout;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin › Ruang & Denah (FR-ADM-05): ukuran grid + editor denah (kursi,
 * meja asisten, lorong, nonaktif).
 */
class RoomController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/rooms/index', [
            'rooms' => Room::withCount(['classes', 'seats' => fn ($q) => $q->where('type', 'seat')])->orderBy('name')->get()->map(fn (Room $room) => [
                'id' => $room->id,
                'name' => $room->name,
                'rows' => $room->rows,
                'cols' => $room->cols,
                'classesCount' => $room->classes_count,
                'seatsCount' => $room->seats_count,
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $room = Room::create($this->validated($request));
        $room->seats()->createMany(RoomLayout::defaultCells($room->rows, $room->cols));

        AuditLog::record('room.created', $room, null, $room->only(['name', 'rows', 'cols']));
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$room->name} ditambahkan."]);

        return to_route('admin.rooms.index');
    }

    public function update(Request $request, Room $room): RedirectResponse
    {
        $before = $room->only(['name', 'rows', 'cols']);
        $validated = $this->validated($request, $room);

        $outside = $room->seats()->where(fn ($q) => $q->where('row', '>', $validated['rows'])->orWhere('col', '>', $validated['cols']));
        if ((clone $outside)->whereHas('contracts')->exists()) {
            throw ValidationException::withMessages(['rows' => 'Ada kursi terkontrak di luar ukuran baru; pindahkan kontraknya terlebih dahulu.']);
        }

        DB::transaction(function () use ($room, $validated, $outside) {
            $outside->delete();
            $room->update($validated);
        });

        AuditLog::record('room.updated', $room, $before, $room->only(['name', 'rows', 'cols']));
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$room->name} diperbarui."]);

        return to_route('admin.rooms.index');
    }

    public function destroy(Room $room): RedirectResponse
    {
        if ($room->classes()->exists()) {
            throw ValidationException::withMessages(['room' => "{$room->name} masih dipakai kelas; pindahkan kelasnya terlebih dahulu."]);
        }

        AuditLog::record('room.deleted', $room, $room->only(['name', 'rows', 'cols']));
        $room->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$room->name} dihapus."]);

        return to_route('admin.rooms.index');
    }

    /**
     * FR-ADM-05: editor denah.
     */
    public function layout(Room $room): Response
    {
        return Inertia::render('admin/rooms/layout', [
            'room' => RoomLayout::for($room),
            'contractedSeatIds' => SeatContract::whereIn('seat_id', $room->seats()->select('id'))->distinct()->pluck('seat_id'),
        ]);
    }

    public function saveLayout(Request $request, Room $room, SaveRoomLayout $save): RedirectResponse
    {
        $validated = $request->validate([
            'cells' => ['present', 'array', 'max:400'],
            'cells.*.row' => ['required', 'integer', 'min:1', 'max:20'],
            'cells.*.col' => ['required', 'integer', 'min:1', 'max:20'],
            'cells.*.type' => ['required', Rule::in(['seat', 'assistant_desk', 'disabled'])],
            'cells.*.label' => ['nullable', 'string', 'max:20'],
        ]);

        $save($room, $validated['cells']);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Denah {$room->name} disimpan."]);

        return to_route('admin.rooms.layout', $room);
    }

    /**
     * @return array{name: string, rows: int, cols: int}
     */
    private function validated(Request $request, ?Room $room = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:50', Rule::unique('rooms', 'name')->ignore($room)],
            'rows' => ['required', 'integer', 'between:1,20'],
            'cols' => ['required', 'integer', 'between:1,20'],
        ], [], ['name' => 'nama ruang', 'rows' => 'jumlah baris', 'cols' => 'jumlah kolom']);
    }
}
