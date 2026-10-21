<?php

namespace App\Providers;

use App\Actions\Fortify\CreateNewUser;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Laravel\Fortify\Fortify;

class FortifyServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureAuthentication();
        $this->configureActions();
        $this->configureViews();
        $this->configureRateLimiting();
    }

    /**
     * FR-AUTH-01: satu field "NIM atau Email". Input berisi "@" dicari di kolom
     * email, selain itu di kolom nim. Akun nonaktif tidak dapat masuk (FR-AUTH-09).
     * Kegagalan apa pun memakai pesan generik yang sama (auth.failed).
     */
    private function configureAuthentication(): void
    {
        Fortify::authenticateUsing(function (Request $request): ?User {
            $login = trim((string) $request->input(Fortify::username()));
            $column = str_contains($login, '@') ? 'email' : 'nim';

            $user = User::where($column, $login)->first();

            if ($user && $user->is_active && Hash::check($request->input('password'), $user->password)) {
                return $user;
            }

            return null;
        });
    }

    /**
     * Configure Fortify actions.
     */
    private function configureActions(): void
    {
        Fortify::createUsersUsing(CreateNewUser::class);
    }

    /**
     * Configure Fortify views.
     */
    private function configureViews(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            // Lupa password (OTP) selalu tersedia: ForgotPasswordController.
            'canResetPassword' => true,
            'canRegister' => (bool) Setting::value('registration_open'),
            'status' => $request->session()->get('status'),
        ]));

        Fortify::registerView(function () {
            abort_unless(Setting::value('registration_open'), 404);

            return Inertia::render('auth/register', [
                'domains' => CreateNewUser::domains(),
                'majors' => CreateNewUser::MAJORS,
                'passwordRules' => Password::defaults()->toPasswordRulesString(),
            ]);
        });

        Fortify::verifyEmailView(fn (Request $request) => Inertia::render('auth/verify-email', [
            'status' => $request->session()->get('status'),
        ]));

        Fortify::confirmPasswordView(fn () => Inertia::render('auth/confirm-password'));
    }

    /**
     * FR-AUTH-07: 5 kali gagal per menit per kombinasi akun + IP.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $throttleKey = Str::transliterate(Str::lower($request->input(Fortify::username())).'|'.$request->ip());

            return Limit::perMinute(5)->by($throttleKey);
        });
    }
}
