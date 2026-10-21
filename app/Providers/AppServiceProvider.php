<?php

namespace App\Providers;

use App\Models\Setting;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Login;
use Illuminate\Database\Query\Builder as QueryBuilder;
use Illuminate\Foundation\DevCommands;
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

        // `composer run dev` ikut menjalankan scheduler (sesi otomatis, pengingat, dll.).
        if ($this->app->runningInConsole()) {
            DevCommands::artisan('schedule:work', 'scheduler');
        }

        // FR-ADM-10: pengaturan Admin menimpa default config.
        if (! $this->app->runningUnitTests()) {
            Setting::apply();
        }

        // Rentang tanggal inklusif yang aman untuk kolom `date` di MySQL maupun SQLite
        // (SQLite menyimpan cast date sebagai "Y-m-d 00:00:00").
        QueryBuilder::macro('whereDateBetween', function (string $column, array $range) {
            /** @var QueryBuilder $this */
            return $this->whereDate($column, '>=', $range[0])->whereDate($column, '<=', $range[1]);
        });

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
