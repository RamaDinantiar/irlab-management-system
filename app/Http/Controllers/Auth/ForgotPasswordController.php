<?php

namespace App\Http\Controllers\Auth;

use App\Actions\Auth\PasswordResetCode;
use App\Actions\Fortify\CreateNewUser;
use App\Actions\Fortify\ResetUserPassword;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * Lupa password dengan kode OTP, khusus email kampus (domain dari Pengaturan
 * Sistem, default @itpln.ac.id):
 *   1. email → dicek terdaftar & aktif, lalu kode 6 digit dikirim;
 *   2. kode → diverifikasi;
 *   3. password baru → disimpan, semua sesi lama diakhiri.
 *
 * Atas permintaan pengguna, email yang belum terdaftar diberi tahu dengan jelas
 * (menggantikan pesan generik FR-AUTH-04). Percobaan dibatasi ThrottlePasswordReset.
 */
class ForgotPasswordController extends Controller
{
    /** Session: email yang sedang menunggu kode / sudah lolos verifikasi. */
    private const PENDING = 'password_reset.email';

    private const VERIFIED = 'password_reset.verified';

    /** Menit untuk mengisi password baru setelah kode benar. */
    private const VERIFIED_MINUTES = 15;

    public function __construct(private PasswordResetCode $codes) {}

    public function create(Request $request): Response
    {
        return Inertia::render('auth/forgot-password', [
            'domains' => CreateNewUser::domains(),
            'email' => $request->session()->get(self::PENDING),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->merge(['email' => Str::lower(trim((string) $request->input('email')))]);
        $request->validate([
            'email' => ['required', 'string', 'email', 'max:255', CreateNewUser::campusEmailRule()],
        ], [], ['email' => 'email']);

        $user = User::where('email', $request->email)->first();

        if (! $user) {
            throw ValidationException::withMessages(['email' => 'Email ini belum terdaftar di IR Lab. Periksa kembali penulisannya atau daftar akun terlebih dahulu.']);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages(['email' => 'Akun ini dinonaktifkan. Hubungi Admin Lab.']);
        }

        if ($wait = $this->codes->resendIn($user->email)) {
            throw ValidationException::withMessages(['email' => "Kode baru dapat diminta lagi dalam {$wait} detik."]);
        }

        try {
            $this->codes->send($user);
        } catch (Throwable $e) {
            Log::error('Gagal mengirim kode reset password', ['email' => $user->email, 'error' => $e->getMessage()]);

            throw ValidationException::withMessages(['email' => 'Email gagal dikirim. Coba lagi beberapa saat lagi atau hubungi Admin Lab.']);
        }

        AuditLog::record('user.password_reset_requested', $user, null, ['email' => $user->email]);

        $request->session()->put(self::PENDING, $user->email);
        $request->session()->forget(self::VERIFIED);

        return to_route('password.code')->with('status', "Kode 6 digit telah dikirim ke {$user->email}.");
    }

    public function showCode(Request $request): Response|RedirectResponse
    {
        $email = $request->session()->get(self::PENDING);

        if (! $email) {
            return to_route('password.request');
        }

        return Inertia::render('auth/reset-code', [
            'email' => $email,
            'minutes' => PasswordResetCode::MINUTES,
            'resendIn' => $this->codes->resendIn($email),
            'status' => $request->session()->get('status'),
        ]);
    }

    public function verifyCode(Request $request): RedirectResponse
    {
        $email = $request->session()->get(self::PENDING);

        if (! $email) {
            return to_route('password.request');
        }

        $request->validate(['code' => ['required', 'digits:6']], ['code.digits' => 'Kode terdiri dari 6 angka.'], ['code' => 'kode']);

        $result = $this->codes->check($email, $request->code);

        if ($result !== 'valid') {
            throw ValidationException::withMessages(['code' => match ($result) {
                'expired' => 'Kode sudah kedaluwarsa. Minta kode baru.',
                'locked' => 'Terlalu banyak kode salah. Minta kode baru.',
                default => 'Kode salah. Sisa '.$this->codes->attemptsLeft($email).' kali percobaan.',
            }]);
        }

        $request->session()->forget(self::PENDING);
        $request->session()->put(self::VERIFIED, ['email' => $email, 'until' => now()->addMinutes(self::VERIFIED_MINUTES)->timestamp]);

        return to_route('password.reset');
    }

    public function edit(Request $request): Response|RedirectResponse
    {
        if (! $email = $this->verifiedEmail($request)) {
            return to_route('password.request');
        }

        return Inertia::render('auth/reset-password', [
            'email' => $email,
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]);
    }

    public function update(Request $request, ResetUserPassword $reset): RedirectResponse
    {
        $user = ($email = $this->verifiedEmail($request)) ? User::where('email', $email)->where('is_active', true)->first() : null;

        if (! $user) {
            return to_route('password.request')->withErrors(['email' => 'Sesi reset password berakhir. Minta kode baru.']);
        }

        $reset->reset($user, $request->only('password', 'password_confirmation'));

        AuditLog::record('user.password_reset', $user, null, ['email' => $user->email]);
        $request->session()->forget(self::VERIFIED);

        return to_route('login')->with('status', __('passwords.reset'));
    }

    private function verifiedEmail(Request $request): ?string
    {
        $verified = $request->session()->get(self::VERIFIED);

        return $verified && $verified['until'] >= now()->timestamp ? $verified['email'] : null;
    }
}
