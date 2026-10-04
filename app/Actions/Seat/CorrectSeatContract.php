<?php

namespace App\Actions\Seat;

use App\Events\SeatContractChanged;
use App\Models\AuditLog;
use App\Models\Seat;
use App\Models\SeatContract;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * US-D03: Admin memindahkan atau membatalkan kontrak kursi dengan alasan;
 * tercatat di audit log dan praktikan diberi notifikasi.
 */
class CorrectSeatContract
{
    public function move(SeatContract $contract, int $seatId, string $reason): SeatContract
    {
        $contract->loadMissing(['labClass', 'seat']);

        $seat = Seat::where('room_id', $contract->labClass->room_id)->whereKey($seatId)->where('type', 'seat')->first()
            ?? throw ValidationException::withMessages(['seat_id' => 'Kursi tujuan tidak tersedia.']);

        try {
            DB::transaction(function () use ($contract, $seat, $reason) {
                if (SeatContract::where('class_id', $contract->class_id)->where('seat_id', $seat->id)->lockForUpdate()->exists()) {
                    throw ValidationException::withMessages(['seat_id' => "{$seat->label} sudah terisi."]);
                }

                $before = ['seat' => $contract->seat->label];
                $contract->update(['seat_id' => $seat->id]);

                AuditLog::record('seat.moved', $contract, $before, ['seat' => $seat->label, 'reason' => $reason]);
            });
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['seat_id' => "{$seat->label} sudah terisi."]);
        }

        SeatContractChanged::dispatch($contract->fresh(['labClass.course', 'seat']), 'moved', $reason);

        return $contract;
    }

    public function cancel(SeatContract $contract, string $reason): void
    {
        $contract->loadMissing(['labClass.course', 'seat']);

        DB::transaction(function () use ($contract, $reason) {
            AuditLog::record('seat.cancelled', $contract, ['seat' => $contract->seat->label, 'user_id' => $contract->user_id], ['reason' => $reason]);
            $contract->delete();
        });

        SeatContractChanged::dispatch($contract, 'cancelled', $reason);
    }
}
