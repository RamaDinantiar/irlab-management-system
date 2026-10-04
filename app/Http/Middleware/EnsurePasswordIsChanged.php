<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * FR-AUTH-05: akun hasil import wajib mengganti password sementara sebelum
 * bisa membuka halaman lain.
 */
class EnsurePasswordIsChanged
{
    private const ALLOWED_ROUTES = ['password.change', 'password.change.update', 'logout', 'session.keep-alive'];

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->must_change_password && ! $request->routeIs(...self::ALLOWED_ROUTES)) {
            return redirect()->route('password.change');
        }

        return $next($request);
    }
}
