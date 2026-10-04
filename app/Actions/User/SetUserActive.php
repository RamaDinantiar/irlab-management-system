<?php

namespace App\Actions\User;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * US-D04-2 / FR-AUTH-09: akun yang dinonaktifkan langsung kehilangan semua
 * sesi aktif — baris sesi (driver database) dihapus dan token Remember Me
 * diganti sehingga cookie lama tidak berlaku.
 */
class SetUserActive
{
    public function __invoke(User $user, bool $active): void
    {
        DB::transaction(function () use ($user, $active) {
            $user->forceFill(['is_active' => $active])->save();

            if (! $active) {
                DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
                $user->forceFill(['remember_token' => Str::random(60)])->save();
            }

            AuditLog::record($active ? 'user.activated' : 'user.deactivated', $user);
        });
    }
}
