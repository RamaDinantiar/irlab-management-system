<?php

namespace App\Actions\Fortify;

use App\Actions\User\EndUserSessions;
use App\Concerns\PasswordValidationRules;
use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

class ResetUserPassword implements ResetsUserPasswords
{
    use PasswordValidationRules;

    public function __construct(private EndUserSessions $endSessions) {}

    /**
     * Validate and reset the user's forgotten password.
     *
     * @param  array<string, string>  $input
     */
    public function reset(User $user, array $input): void
    {
        Validator::make($input, [
            'password' => $this->passwordRules(),
        ])->validate();

        $user->forceFill([
            'password' => $input['password'],
            // Password pilihan sendiri → tidak perlu dipaksa ganti lagi (FR-AUTH-05).
            'must_change_password' => false,
        ])->save();

        // Reset lewat email = akun mungkin diambil alih: keluarkan semua perangkat.
        ($this->endSessions)($user);
    }
}
