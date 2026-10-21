<?php

namespace App\Actions\User;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Akhiri sesi login sebuah akun: baris sesi (driver database) dihapus dan token
 * Remember Me diganti sehingga cookie lama di perangkat lain tidak berlaku.
 */
class EndUserSessions
{
    /** Semua perangkat (akun dinonaktifkan, password direset lewat email). */
    public function __invoke(User $user): void
    {
        DB::table(config('session.table', 'sessions'))->where('user_id', $user->id)->delete();
        $user->forceFill(['remember_token' => Str::random(60)])->save();
    }

    /**
     * Perangkat lain saja (password diganti sendiri): sesi saat ini tetap masuk,
     * dengan ID sesi & cookie Remember Me baru.
     */
    public function exceptCurrent(Request $request): void
    {
        $user = $request->user();

        DB::table(config('session.table', 'sessions'))
            ->where('user_id', $user->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();
        $user->forceFill(['remember_token' => Str::random(60)])->save();

        Auth::guard('web')->login($user, (bool) $request->session()->get('auth.remembered', false));
    }
}
