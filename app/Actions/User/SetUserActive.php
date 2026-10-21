<?php

namespace App\Actions\User;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * US-D04-2 / FR-AUTH-09: akun yang dinonaktifkan langsung kehilangan semua
 * sesi aktif — baris sesi (driver database) dihapus dan token Remember Me
 * diganti sehingga cookie lama tidak berlaku. Admin aktif terakhir tidak dapat
 * dinonaktifkan.
 */
class SetUserActive
{
    public function __construct(private EndUserSessions $endSessions) {}

    public function __invoke(User $user, bool $active): void
    {
        if (! $active && $user->isLastActiveAdmin()) {
            throw ValidationException::withMessages(['active' => 'Admin aktif terakhir tidak dapat dinonaktifkan.']);
        }

        DB::transaction(function () use ($user, $active) {
            $user->forceFill(['is_active' => $active])->save();

            if (! $active) {
                ($this->endSessions)($user);
            }

            AuditLog::record($active ? 'user.activated' : 'user.deactivated', $user);
        });
    }
}
