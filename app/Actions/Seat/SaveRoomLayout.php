<?php

namespace App\Actions\Seat;

use App\Models\AuditLog;
use App\Models\Room;
use App\Models\Seat;
use App\Models\SeatContract;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * FR-ADM-05: simpan denah ruang. Sel dicocokkan per posisi (baris, kolom)
 * sehingga kursi yang tetap di tempatnya mempertahankan kontraknya; kursi
 * yang sudah dikontrak tidak boleh dihapus atau diubah jenisnya.
 */
class SaveRoomLayout
{
    /**
     * @param  list<array{row: int, col: int, type: string, label: string|null}>  $cells
     */
    public function __invoke(Room $room, array $cells): void
    {
        $errors = [];
        $positions = [];
        $labels = [];

        foreach ($cells as $i => $cell) {
            $key = "{$cell['row']}:{$cell['col']}";
            $label = $cell['type'] === 'seat' ? trim((string) $cell['label']) : null;

            if ($cell['row'] > $room->rows || $cell['col'] > $room->cols) {
                $errors["cells.{$i}"] = 'Sel berada di luar ukuran ruang.';
            } elseif (isset($positions[$key])) {
                $errors["cells.{$i}"] = 'Posisi sel ganda.';
            } elseif ($cell['type'] === 'seat' && $label === '') {
                $errors["cells.{$i}"] = 'Setiap kursi wajib memiliki label.';
            } elseif ($label !== null && isset($labels[mb_strtoupper($label)])) {
                $errors["cells.{$i}"] = "Label {$label} dipakai lebih dari satu kursi.";
            }

            $positions[$key] = true;
            if ($label !== null) {
                $labels[mb_strtoupper($label)] = true;
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        DB::transaction(function () use ($room, $cells) {
            $existing = $room->seats()->lockForUpdate()->get()->keyBy(fn (Seat $seat) => "{$seat->row}:{$seat->col}");
            $incoming = collect($cells)->keyBy(fn ($cell) => "{$cell['row']}:{$cell['col']}");
            $contracted = SeatContract::whereIn('seat_id', $existing->pluck('id'))->pluck('seat_id')->unique()->all();

            foreach ($existing as $key => $seat) {
                $next = $incoming[$key] ?? null;
                if (in_array($seat->id, $contracted, true) && (! $next || $next['type'] !== 'seat')) {
                    throw ValidationException::withMessages(['cells' => "{$seat->label} masih dikontrak praktikan; pindahkan kontraknya terlebih dahulu."]);
                }
            }

            // Hapus sel yang hilang & kosongkan label dulu agar UNIQUE(room_id, label) tidak bentrok saat label ditukar.
            $room->seats()->whereNotIn('id', $existing->filter(fn ($s, $key) => isset($incoming[$key]))->pluck('id'))->delete();
            $room->seats()->update(['label' => null]);

            foreach ($incoming as $key => $cell) {
                $room->seats()->updateOrCreate(
                    ['row' => $cell['row'], 'col' => $cell['col']],
                    ['type' => $cell['type'], 'label' => $cell['type'] === 'seat' ? trim((string) $cell['label']) : null],
                );
            }

            AuditLog::record('room.layout_saved', $room, null, [
                'seats' => $incoming->where('type', 'seat')->count(),
                'cells' => $incoming->count(),
            ]);
        });
    }
}
