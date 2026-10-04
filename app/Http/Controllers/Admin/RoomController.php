<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Room;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin › Ruang & Denah (FR-ADM-05) — versi awal: nama & ukuran grid.
 * Editor denah (kursi, meja asisten, lorong) ditambahkan di modul Seats.
 */
class RoomController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/rooms/index', [
            'rooms' => Room::withCount('classes')->orderBy('name')->get()->map(fn (Room $room) => [
                'id' => $room->id,
                'name' => $room->name,
                'rows' => $room->rows,
                'cols' => $room->cols,
                'classesCount' => $room->classes_count,
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $room = Room::create($this->validated($request));

        AuditLog::record('room.created', $room, null, $room->only(['name', 'rows', 'cols']));
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$room->name} ditambahkan."]);

        return to_route('admin.rooms.index');
    }

    public function update(Request $request, Room $room): RedirectResponse
    {
        $before = $room->only(['name', 'rows', 'cols']);
        $room->update($this->validated($request, $room));

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
