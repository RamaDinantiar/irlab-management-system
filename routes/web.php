<?php

use App\Enums\Role;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Asisten\DashboardController as AsistenDashboardController;
use App\Http\Controllers\Auth\ChangePasswordController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\Praktikan\DashboardController as PraktikanDashboardController;
use App\Http\Controllers\SearchController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

// Landing page publik dikerjakan terpisah (PRD Bagian 0) — beranda aplikasi = login.
Route::redirect('/', '/login')->name('home');

Route::middleware('auth')->group(function () {
    // FR-AUTH-05: ganti password sementara pada login pertama.
    Route::get('password/change', [ChangePasswordController::class, 'edit'])->name('password.change');
    Route::put('password/change', [ChangePasswordController::class, 'update'])->name('password.change.update');

    // NFR-F04: unduhan file lewat signed URL (15 menit) + cek hak akses.
    Route::get('files/{file}', [FileController::class, 'show'])->middleware('signed')->name('files.show');

    // FR-AUTH-06: dipanggil frontend selama pengguna aktif agar sesi 30 menit tidak habis.
    Route::post('session/keep-alive', fn () => response()->noContent())->name('session.keep-alive');
});

Route::middleware(['auth', 'verified'])->group(function () {
    // Role-based routing setelah login (FR-AUTH-02).
    Route::get('dashboard', fn (Request $request) => redirect()->route(
        $request->user()->role->dashboardRoute(),
    ))->name('dashboard');

    // Pencarian global topbar (sesuai peran).
    Route::get('search', SearchController::class)->middleware('throttle:60,1')->name('search');

    // Lonceng notifikasi + pengumuman (semua peran).
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::get('notifications/{id}/read', [NotificationController::class, 'read'])->name('notifications.read');

    foreach (Role::cases() as $role) {
        Route::prefix($role->value)
            ->name($role->value.'.')
            // FR-ADM-11: Admin memiliki akses ke semua menu Asisten untuk seluruh kelas.
            ->middleware($role === Role::Asisten ? 'role:asisten,admin' : 'role:'.$role->value)
            ->group(function () use ($role) {
                Route::get('dashboard', match ($role) {
                    Role::Praktikan => PraktikanDashboardController::class,
                    Role::Asisten => AsistenDashboardController::class,
                    Role::Admin => AdminDashboardController::class,
                })->name('dashboard');

                // Route modul per peran, mis. routes/admin.php.
                if (file_exists($routes = __DIR__."/{$role->value}.php")) {
                    require $routes;
                }
            });
    }
});

require __DIR__.'/settings.php';

// Alat bantu pengembangan — HANYA di lingkungan lokal (APP_ENV=local).
if (app()->isLocal()) {
    // Katalog komponen UI untuk dicocokkan dengan Figma.
    Route::inertia('dev/komponen', 'dev/components')->name('dev.components');

    // Masuk cepat sebagai akun demo seeder, mis. /dev/login-as/asisten?to=/asisten/grade
    // (?as=yozika untuk akun demo tertentu, mis. Bendahara; ?sidebar=collapsed untuk sidebar ikon).
    Route::get('dev/login-as/{role}', function (Request $request, Role $role) {
        $user = User::where('role', $role)
            ->where('email', 'like', ($request->filled('as') ? preg_replace('/[^a-z]/', '', (string) $request->query('as')) : '%').'@irlab.test')
            ->firstOrFail();
        Auth::login($user);
        $request->session()->regenerate();

        $to = $request->query('to');
        $response = is_string($to) && str_starts_with($to, '/') && ! str_starts_with($to, '//')
            ? redirect($to)
            : redirect()->route($role->dashboardRoute());

        return $request->has('sidebar')
            ? $response->withCookie(cookie('sidebar_state', $request->query('sidebar') === 'collapsed' ? 'false' : 'true', httpOnly: false))
            : $response;
    })->name('dev.login-as');
}
