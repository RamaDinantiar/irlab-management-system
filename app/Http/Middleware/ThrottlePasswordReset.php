<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * PRD 8.1 (rate limiting reset password): route lupa/reset password
 * tidak punya limiter bawaan. Batas per email + IP (praktikan satu kampus
 * berbagi IP), dan batas total per IP agar tidak dipakai mengirim email massal
 * atau menebak kode OTP. Langkah kode & password memakai email dari session.
 */
class ThrottlePasswordReset
{
    /** Route → [maks per email+IP per 10 menit, maks per IP per jam, field pesan error]. */
    private const LIMITS = [
        'password.email' => [3, 20, 'email'],
        'password.code.verify' => [10, 30, 'code'],
        'password.update' => [5, 30, 'password'],
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $route = $request->isMethod('POST') ? collect(array_keys(self::LIMITS))->first(fn ($name) => $request->routeIs($name)) : null;

        if ($route === null) {
            return $next($request);
        }

        [$perEmail, $perIp, $field] = self::LIMITS[$route];
        $email = $request->input('email') ?? $request->session()->get('password_reset.email') ?? $request->session()->get('password_reset.verified.email');
        $keys = [
            "{$route}:".Str::transliterate(Str::lower(trim((string) $email))).'|'.$request->ip() => [$perEmail, 600],
            "{$route}:".$request->ip() => [$perIp, 3600],
        ];

        foreach ($keys as $key => [$max]) {
            if (RateLimiter::tooManyAttempts($key, $max)) {
                return back()->withInput($request->only('email'))->withErrors([
                    $field => 'Terlalu banyak percobaan. Coba lagi dalam '.max(1, (int) ceil(RateLimiter::availableIn($key) / 60)).' menit.',
                ]);
            }
        }

        foreach ($keys as $key => [, $decay]) {
            RateLimiter::hit($key, $decay);
        }

        return $next($request);
    }
}
