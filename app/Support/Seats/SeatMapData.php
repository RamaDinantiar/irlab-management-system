<?php

namespace App\Support\Seats;

use App\Models\LabClass;
use App\Models\SeatContract;
use App\Models\User;

/**
 * Data denah + penghuni kursi satu kelas untuk komponen React `SeatMap`.
 */
class SeatMapData
{
    /**
     * @return array{layout: array<string, mixed>, occupants: list<array<string, mixed>>}|null
     */
    public static function for(LabClass $class, ?User $viewer = null, bool $withDetail = false): ?array
    {
        $class->loadMissing('room');

        if (! $class->room) {
            return null;
        }

        return [
            'layout' => RoomLayout::for($class->room),
            'occupants' => $class->seatContracts()->get()->map(fn (SeatContract $contract) => [
                'seatId' => $contract->seat_id,
                'contractId' => $withDetail ? $contract->id : null,
                'name' => $contract->snapshot_name,
                'nim' => $contract->snapshot_nim,
                'major' => $withDetail ? $contract->snapshot_major : null,
                'mine' => $viewer && $contract->user_id === $viewer->id,
            ])->values()->all(),
        ];
    }

    /**
     * Ringkasan kelas untuk header/kartu.
     *
     * @return array<string, mixed>
     */
    public static function classSummary(LabClass $class): array
    {
        $class->loadMissing(['course', 'room', 'assistants']);

        return [
            'id' => $class->id,
            'course' => $class->course->name,
            'code' => $class->course->code,
            'credits' => $class->course->credits,
            'className' => $class->name,
            'dayOfWeek' => $class->day_of_week,
            'startTime' => $class->startClock(),
            'endTime' => $class->endClock(),
            'room' => $class->room?->name,
            'assistants' => $class->assistants->pluck('name')->values(),
            'contractOpen' => $class->seat_contract_open,
        ];
    }
}
