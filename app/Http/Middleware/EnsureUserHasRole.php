<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Membatasi grup route per peran, mis. `role:asisten` (FR-AUTH-02).
 * Membuka URL milik peran lain menghasilkan 403.
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        abort_unless(in_array($request->user()?->role->value, $roles, true), 403);

        return $next($request);
    }
}
