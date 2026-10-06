<?php

use App\Http\Middleware\EnsurePasswordIsChanged;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\HandleInertiaRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['sidebar_state']);

        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);

        $middleware->web(append: [
            EnsureUserIsActive::class,
            EnsurePasswordIsChanged::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Halaman error yang ramah (FR-AUTH-02: akses URL peran lain → 403).
        // 500/503 tetap memakai halaman debug Laravel di lingkungan lokal.
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            $status = $response->getStatusCode();
            $friendly = in_array($status, [403, 404], true)
                || (in_array($status, [500, 503], true) && ! app()->hasDebugModeEnabled());

            if ($friendly && ! $request->expectsJson()) {
                // 403 karena peran: tunjukkan akun yang sedang aktif (mis. tab lain
                // baru saja masuk sebagai Praktikan sehingga sesi berganti).
                $user = $request->user();

                return Inertia::render('error', [
                    'status' => $status,
                    'signedInAs' => $status === 403 && $user ? ['name' => $user->name, 'role' => $user->role->label()] : null,
                ])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            if ($status === 419) {
                return back()->withErrors(['login' => 'Sesi Anda telah berakhir. Silakan masuk kembali.']);
            }

            return $response;
        });
    })->create();
