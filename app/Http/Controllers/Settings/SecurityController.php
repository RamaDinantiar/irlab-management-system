<?php

namespace App\Http\Controllers\Settings;

use App\Actions\User\EndUserSessions;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\PasswordUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class SecurityController extends Controller
{
    /**
     * Show the user's security settings page (ganti kata sandi).
     */
    public function edit(): Response
    {
        return Inertia::render('settings/security', [
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]);
    }

    /**
     * Update the user's password; sesi di perangkat lain diakhiri.
     */
    public function update(PasswordUpdateRequest $request, EndUserSessions $endSessions): RedirectResponse
    {
        $request->user()->update([
            'password' => $request->password,
        ]);
        $endSessions->exceptCurrent($request);

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Kata sandi berhasil diperbarui.']);

        return back();
    }
}
