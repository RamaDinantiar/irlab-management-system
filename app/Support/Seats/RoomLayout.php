<?php

namespace App\Support\Seats;

use App\Models\Room;
use App\Models\Seat;

/**
 * Bentuk data denah untuk komponen React `SeatMap` dan pembuat denah bawaan.
 *
 * @phpstan-type Layout array{id: int, name: string, rows: int, cols: int, cells: array<int, array{id: int, row: int, col: int, type: string, label: string|null}>}
 */
class RoomLayout
{
    /**
     * @return Layout
     */
    public static function for(Room $room): array
    {
        return [
            'id' => $room->id,
            'name' => $room->name,
            'rows' => $room->rows,
            'cols' => $room->cols,
            'cells' => $room->seats()->orderBy('row')->orderBy('col')->get()
                ->map(fn (Seat $seat) => ['id' => $seat->id, 'row' => $seat->row, 'col' => $seat->col, 'type' => $seat->type, 'label' => $seat->label])
                ->values()->all(),
        ];
    }

    /**
     * Denah bawaan mirip Figma: lorong di tengah, meja asisten di pojok depan
     * kiri, nomor kursi berkelok (baris ganjil kanan→kiri, genap kiri→kanan).
     *
     * @return list<array{row: int, col: int, type: string, label: string|null}>
     */
    public static function defaultCells(int $rows, int $cols): array
    {
        $aisle = $cols >= 5 ? intdiv($cols, 2) + 1 : null;
        $cells = [];

        for ($row = 1; $row <= $rows; $row++) {
            for ($col = 1; $col <= $cols; $col++) {
                if ($col === $aisle) {
                    continue;
                }

                if ($col === 1 && $row <= 2 && $rows >= 4) {
                    if ($row === 1) {
                        $cells[] = ['row' => $row, 'col' => $col, 'type' => 'assistant_desk', 'label' => null];
                    }

                    continue;
                }

                $cells[] = ['row' => $row, 'col' => $col, 'type' => 'seat', 'label' => null];
            }
        }

        return self::numbered($cells);
    }

    /**
     * Penomoran ulang kursi PC-01… berkelok mulai dari depan kanan.
     *
     * @param  list<array{row: int, col: int, type: string, label: string|null}>  $cells
     * @return list<array{row: int, col: int, type: string, label: string|null}>
     */
    public static function numbered(array $cells): array
    {
        $seats = array_values(array_filter($cells, fn ($cell) => $cell['type'] === 'seat'));
        $key = fn (array $cell) => [$cell['row'], $cell['row'] % 2 === 1 ? -$cell['col'] : $cell['col']];
        usort($seats, fn ($a, $b) => $key($a) <=> $key($b));

        $labels = [];
        foreach ($seats as $i => $seat) {
            $labels["{$seat['row']}:{$seat['col']}"] = 'PC-'.str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT);
        }

        return array_map(fn ($cell) => [...$cell, 'label' => $labels["{$cell['row']}:{$cell['col']}"] ?? null], $cells);
    }
}
