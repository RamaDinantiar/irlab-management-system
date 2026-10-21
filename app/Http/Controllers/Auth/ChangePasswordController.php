<?php

namespace App\Http\Controllers\Auth;

use App\Actions\User\EndUserSessions;
use App\Concerns\PasswordValidationRules;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * FR-AUTH-05: ganti password wajib saat login pertama (akun hasil import).
 */
class ChangePasswordController extends Controller
{
    use PasswordValidationRules;

    public function edit(Request $request): Response|RedirectResponse
    {
        if (! $request->user()->must_change_password) {
            return redirect()->route($request->user()->role->dashboardRoute());
        }

        return Inertia::render('auth/change-password', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]);
    }

    public function update(Request $request, EndUserSessions $endSessions): RedirectResponse
    {
        $validated = $request->validate([
            'password' => $this->passwordRules(),
        ]);

        $user = $request->user();

        if (Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'password' => 'Kata sandi baru harus berbeda dari kata sandi sementara.',
            ]);
        }

        $user->forceFill([
            'password' => $validated['password'],
            'must_change_password' => false,
        ])->save();
        // Password sementara mungkin sudah diketahui orang lain: akhiri sesi lainnya.
        $endSessions->exceptCurrent($request);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Kata sandi berhasil diganti. Selamat datang!']);

        return redirect()->route($user->role->dashboardRoute());
    }
}
