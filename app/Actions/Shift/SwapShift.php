<?php

namespace App\Actions\Shift;

use App\Enums\Role;
use App\Events\ShiftSwapChanged;
use App\Models\AuditLog;
use App\Models\Shift;
use App\Models\ShiftSwap;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * US-A05 / FR-AS-03: tukar shift. Asisten tujuan menyetujui → shift pindah
 * pemilik; Admin hanya diberi tahu (A5). Kedaluwarsa 24 jam sebelum shift.
 */
class SwapShift
{
    public function request(User $from, Shift $shift, int $toUserId, string $reason): ShiftSwap
    {
        abort_unless($shift->user_id === $from->id, 403);

        if ($shift->startsAt()->subDay()->isPast()) {
            $this->fail('shift_id', 'Tukar shift harus diajukan paling lambat 24 jam sebelum shift dimulai.');
        }

        if ($shift->swaps()->where('status', 'pending')->exists()) {
            $this->fail('shift_id', 'Shift ini masih memiliki pengajuan tukar yang menunggu jawaban.');
        }

        $to = User::where('role', Role::Asisten)->where('is_active', true)->whereKeyNot($from->id)->find($toUserId)
            ?? $this->fail('to_user_id', 'Asisten tujuan tidak valid.');

        if (Shift::overlaps($to->id, $shift->date->toDateString(), $shift->start_time, $shift->end_time)) {
            $this->fail('to_user_id', "{$to->name} memiliki shift lain pada jam tersebut.");
        }

        $swap = ShiftSwap::create(['shift_id' => $shift->id, 'from_user_id' => $from->id, 'to_user_id' => $to->id, 'reason' => $reason, 'status' => 'pending']);
        AuditLog::record('shift_swap.requested', $swap, null, ['shift_id' => $shift->id, 'to' => $to->id]);
        ShiftSwapChanged::dispatch($swap);

        return $swap;
    }

    public function respond(User $responder, ShiftSwap $swap, bool $approve, ?string $note = null): void
    {
        abort_unless($swap->to_user_id === $responder->id, 403);

        DB::transaction(function () use ($swap, $approve, $note) {
            $swap = ShiftSwap::with('shift')->lockForUpdate()->findOrFail($swap->id);

            if ($swap->status !== 'pending') {
                $this->fail('swap', 'Pengajuan ini sudah tidak menunggu jawaban.');
            }

            if ($swap->shift->startsAt()->subDay()->isPast()) {
                $swap->update(['status' => 'expired', 'responded_at' => now()]);
                $this->fail('swap', 'Pengajuan sudah kedaluwarsa (kurang dari 24 jam sebelum shift).');
            }

            if ($approve) {
                if (Shift::overlaps($swap->to_user_id, $swap->shift->date->toDateString(), $swap->shift->start_time, $swap->shift->end_time, $swap->shift_id)) {
                    $this->fail('swap', 'Anda kini memiliki shift lain pada jam tersebut.');
                }

                $swap->shift->update(['user_id' => $swap->to_user_id]);
            }

            $swap->update(['status' => $approve ? 'approved' : 'rejected', 'response_note' => $note, 'responded_at' => now()]);
            AuditLog::record($approve ? 'shift_swap.approved' : 'shift_swap.rejected', $swap, ['user_id' => $swap->from_user_id], ['user_id' => $approve ? $swap->to_user_id : $swap->from_user_id]);
        });

        ShiftSwapChanged::dispatch($swap->fresh());
    }

    public function cancel(User $from, ShiftSwap $swap): void
    {
        abort_unless($swap->from_user_id === $from->id && $swap->status === 'pending', 403);

        $swap->update(['status' => 'cancelled', 'responded_at' => now()]);
        AuditLog::record('shift_swap.cancelled', $swap);
    }

    /** US-A05-3: dipanggil scheduler tiap jam. */
    public static function expireStale(): int
    {
        // Kandidat dipersempit di DB (tanggal ≤ besok), lalu dicek per jam di PHP — portabel MySQL/SQLite.
        $stale = ShiftSwap::where('status', 'pending')
            ->whereHas('shift', fn ($q) => $q->whereDate('date', '<=', now()->addDay()->toDateString()))
            ->with('shift')->get()
            ->filter(fn (ShiftSwap $swap) => $swap->shift->startsAt()->subDay()->isPast());

        ShiftSwap::whereKey($stale->modelKeys())->update(['status' => 'expired', 'responded_at' => now()]);

        return $stale->count();
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
