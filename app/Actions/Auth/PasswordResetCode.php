<?php

namespace App\Actions\Auth;

use App\Models\User;
use App\Notifications\PasswordResetCodeNotification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Kode OTP lupa password: 6 digit, berlaku 10 menit, maks. 5 kali salah,
 * dan baru bisa diminta ulang setelah 60 detik.
 */
class PasswordResetCode
{
    public const MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    public const RESEND_SECONDS = 60;

    private const TABLE = 'password_reset_codes';

    /** Kirim kode baru (kode lama otomatis tidak berlaku). */
    public function send(User $user): void
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        DB::table(self::TABLE)->updateOrInsert(['email' => $user->email], [
            'code' => Hash::make($code),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(self::MINUTES),
            'created_at' => now(),
        ]);

        // Dikirim langsung (bukan antrean) agar kode segera sampai dan kegagalan SMTP terlihat.
        $user->notifyNow(new PasswordResetCodeNotification($code, self::MINUTES));
    }

    /** Detik tersisa sebelum kode baru boleh diminta (0 = boleh). */
    public function resendIn(string $email): int
    {
        $row = DB::table(self::TABLE)->where('email', $email)->first();

        if (! $row) {
            return 0;
        }

        return max(0, self::RESEND_SECONDS - (int) Carbon::parse($row->created_at)->diffInSeconds(now()));
    }

    /**
     * @return 'valid'|'invalid'|'expired'|'locked'
     */
    public function check(string $email, string $code): string
    {
        $row = DB::table(self::TABLE)->where('email', $email)->first();

        if (! $row || Carbon::parse($row->expires_at)->isPast()) {
            return 'expired';
        }

        if ($row->attempts >= self::MAX_ATTEMPTS) {
            return 'locked';
        }

        if (! Hash::check($code, $row->code)) {
            DB::table(self::TABLE)->where('email', $email)->increment('attempts');

            return $row->attempts + 1 >= self::MAX_ATTEMPTS ? 'locked' : 'invalid';
        }

        DB::table(self::TABLE)->where('email', $email)->delete();

        return 'valid';
    }

    /** Sisa percobaan untuk pesan "kode salah". */
    public function attemptsLeft(string $email): int
    {
        $attempts = (int) DB::table(self::TABLE)->where('email', $email)->value('attempts');

        return max(0, self::MAX_ATTEMPTS - $attempts);
    }
}
