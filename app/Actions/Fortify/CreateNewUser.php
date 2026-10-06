<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\Setting;
use App\Models\User;
use Closure;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

/**
 * Pendaftaran mandiri Praktikan, hanya untuk email kampus (default
 *
 * @itpln.ac.id, diatur Admin di Pengaturan Sistem). Akun baru wajib
 * memverifikasi email sebelum dapat memakai portal (middleware `verified`).
 */
class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules;

    /** Maks. percobaan daftar per IP per jam. */
    private const MAX_ATTEMPTS = 10;

    /** Program studi yang dapat dipilih saat pendaftaran mandiri. */
    public const MAJORS = ['S1 Teknik Informatika', 'S1 Sistem Informasi'];

    /**
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        if (! Setting::value('registration_open')) {
            throw ValidationException::withMessages(['email' => 'Pendaftaran akun sedang ditutup. Hubungi Admin Lab.']);
        }

        $key = 'register:'.request()->ip();
        if (RateLimiter::tooManyAttempts($key, self::MAX_ATTEMPTS)) {
            throw ValidationException::withMessages(['email' => 'Terlalu banyak percobaan pendaftaran. Coba lagi dalam '.ceil(RateLimiter::availableIn($key) / 60).' menit.']);
        }
        RateLimiter::hit($key, 3600);

        $input['email'] = Str::lower(trim((string) ($input['email'] ?? '')));
        $input['nim'] = trim((string) ($input['nim'] ?? ''));
        $domains = self::domains();

        Validator::make($input, [
            'name' => ['required', 'string', 'max:255'],
            'nim' => ['required', 'regex:/^\d{5,20}$/', Rule::unique(User::class)],
            'major' => ['required', 'string', Rule::in(self::MAJORS)],
            'cohort_year' => ['nullable', 'integer', 'between:2000,2100'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique(User::class), function (string $attribute, mixed $value, Closure $fail) use ($domains) {
                // Cocokkan domain persis setelah "@" terakhir (sub-domain & domain tiruan ditolak).
                $domain = Str::afterLast((string) $value, '@');
                if (! in_array($domain, $domains, true)) {
                    $fail('Gunakan email kampus (@'.implode(', @', $domains).').');
                }
            }],
            'password' => $this->passwordRules(),
            'terms' => ['accepted'],
        ], [
            'nim.regex' => 'NIM harus 5–20 digit angka.',
            'nim.unique' => 'NIM ini sudah terdaftar. Gunakan Lupa Password bila Anda pemiliknya.',
            'email.unique' => 'Email ini sudah terdaftar. Gunakan Lupa Password bila Anda pemiliknya.',
            'terms.accepted' => 'Setujui Ketentuan Layanan Lab IR terlebih dahulu.',
        ], ['name' => 'nama lengkap', 'nim' => 'NIM', 'major' => 'program studi', 'cohort_year' => 'angkatan', 'password' => 'kata sandi'])->validate();

        $user = new User([
            'name' => $input['name'],
            'nim' => $input['nim'],
            'email' => $input['email'],
            'password' => $input['password'],
            'major' => $input['major'],
            'cohort_year' => $input['cohort_year'] ?: null,
        ]);
        $user->forceFill(['role' => Role::Praktikan, 'is_active' => true, 'must_change_password' => false])->save();

        AuditLog::record('user.self_registered', $user, null, ['nim' => $user->nim, 'email' => $user->email]);

        return $user;
    }

    /**
     * @return list<string>
     */
    public static function domains(): array
    {
        return array_values(array_filter(array_map(
            fn ($d) => Str::lower(trim(ltrim(trim($d), '@'))),
            explode(',', (string) Setting::value('registration_domains')),
        )));
    }
}
