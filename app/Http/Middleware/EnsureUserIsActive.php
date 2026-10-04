<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * FR-AUTH-09: akun yang dinonaktifkan Admin langsung kehilangan sesinya,
 * termasuk sesi yang sedang berjalan atau masuk lewat Remember Me.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && ! $request->user()->is_active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors([
                'login' => __('auth.failed'),
            ]);
        }

        return $next($request);
    }
}
