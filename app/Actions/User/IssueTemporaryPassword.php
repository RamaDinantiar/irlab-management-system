<?php

namespace App\Actions\User;

use App\Models\User;
use App\Notifications\AccountCredentialsNotification;
use Illuminate\Support\Str;

/**
 * Password sementara (US-D04-1): 10 karakter huruf + angka (lolos FR-AUTH-05),
 * wajib diganti saat login berikutnya; dikirim lewat email (queue). Reset oleh
 * Admin mengakhiri semua sesi akun itu (akun mungkin sudah diambil alih).
 */
class IssueTemporaryPassword
{
    public function __construct(private EndUserSessions $endSessions) {}

    public function __invoke(User $user, bool $isReset = false): string
    {
        $password = Str::password(10, letters: true, numbers: true, symbols: false);

        $user->forceFill([
            'password' => $password,
            'must_change_password' => true,
        ])->save();

        if ($isReset) {
            ($this->endSessions)($user);
        }

        $user->notify(new AccountCredentialsNotification($password, $isReset));

        return $password;
    }
}
