<?php

namespace App\Providers;

use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Login;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
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
        $this->configureDefaults();

        // Catat apakah sesi dibuat dengan Remember Me. Frontend memakainya untuk
        // tidak memaksa logout idle pada perangkat yang dipilih untuk diingat.
        Event::listen(Login::class, function (Login $event): void {
            if (request()->hasSession()) {
                request()->session()->put('auth.remembered', $event->remember);
            }
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        // FR-AUTH-05: minimal 8 karakter, kombinasi huruf dan angka.
        Password::defaults(fn (): Password => Password::min(8)->letters()->numbers());
    }
}
