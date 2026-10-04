<?php

namespace App\Actions\Seat;

use App\Models\AuditLog;
use App\Models\LabClass;
use App\Models\Seat;
use App\Models\SeatContract;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * US-P04 / FR-PST: praktikan mengontrak satu kursi per kelas selama semester.
 * Dua praktikan memilih kursi yang sama → constraint UNIQUE menolak yang kedua.
 */
class ContractSeat
{
    public const TAKEN = 'Kursi baru saja diambil. Denah sudah diperbarui, silakan pilih kursi lain.';

    public function __invoke(User $user, LabClass $class, int $seatId): SeatContract
    {
        abort_unless($class->enrollments()->where('user_id', $user->id)->exists(), 403);

        if (! $class->seat_contract_open) {
            $this->fail('Periode kontrak kursi untuk kelas ini belum dibuka.');
        }

        // FR-PST-03: profil wajib lengkap.
        if (blank($user->nim) || blank($user->major)) {
            $this->fail('Lengkapi NIM dan program studi di profil terlebih dahulu.');
        }

        $seat = Seat::where('room_id', $class->room_id)->whereKey($seatId)->where('type', 'seat')->first()
            ?? $this->fail('Kursi tidak tersedia di ruang kelas ini.');

        try {
            return DB::transaction(function () use ($user, $class, $seat) {
                // US-P04-5: kontrak tidak bisa diubah sendiri.
                if (SeatContract::where('class_id', $class->id)->where('user_id', $user->id)->exists()) {
                    $this->fail('Anda sudah memiliki kursi di kelas ini. Perubahan hanya melalui Admin.');
                }

                if (SeatContract::where('class_id', $class->id)->where('seat_id', $seat->id)->lockForUpdate()->exists()) {
                    $this->fail(self::TAKEN);
                }

                $contract = SeatContract::create([
                    'class_id' => $class->id,
                    'seat_id' => $seat->id,
                    'user_id' => $user->id,
                    'snapshot_name' => $user->name,
                    'snapshot_nim' => $user->nim,
                    'snapshot_major' => $user->major,
                ]);

                AuditLog::record('seat.contracted', $contract, null, ['class_id' => $class->id, 'seat' => $seat->label]);

                return $contract;
            });
        } catch (UniqueConstraintViolationException) {
            $this->fail(self::TAKEN);
        }
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['seat_id' => $message]);
    }
}
