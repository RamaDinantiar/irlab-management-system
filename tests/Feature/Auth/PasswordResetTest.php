<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Notifications\PasswordResetCodeNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Lupa password dengan kode OTP 6 digit, khusus email kampus.
 */
class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->user = User::factory()->create(['email' => 'rina@itpln.ac.id']);
    }

    /** Minta kode lalu ambil kode asli dari notifikasi palsu. */
    private function requestCode(): string
    {
        $this->post(route('password.email'), ['email' => 'Rina@ITPLN.ac.id '])->assertRedirect(route('password.code'));

        $code = null;
        Notification::assertSentTo($this->user, PasswordResetCodeNotification::class, function ($notification) use (&$code) {
            preg_match('/^(\d{6}) /', $notification->toMail($this->user)->subject, $m);
            $code = $m[1];

            return true;
        });

        return $code;
    }

    public function test_forgot_password_screen_can_be_rendered()
    {
        $this->get(route('password.request'))->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('auth/forgot-password')->where('domains', ['itpln.ac.id']));
    }

    public function test_only_campus_emails_are_accepted()
    {
        User::factory()->create(['email' => 'luar@gmail.com']);

        $this->post(route('password.email'), ['email' => 'luar@gmail.com'])->assertSessionHasErrors(['email' => 'Gunakan email kampus (@itpln.ac.id).']);
        $this->post(route('password.email'), ['email' => 'rina@mail.itpln.ac.id'])->assertSessionHasErrors('email');
        Notification::assertNothingSent();
    }

    public function test_unregistered_and_inactive_accounts_are_told_clearly()
    {
        $this->post(route('password.email'), ['email' => 'tidak-ada@itpln.ac.id'])
            ->assertSessionHasErrors(['email' => 'Email ini belum terdaftar di IR Lab. Periksa kembali penulisannya atau daftar akun terlebih dahulu.']);

        User::factory()->create(['email' => 'nonaktif@itpln.ac.id', 'is_active' => false]);
        $this->post(route('password.email'), ['email' => 'nonaktif@itpln.ac.id'])
            ->assertSessionHasErrors(['email' => 'Akun ini dinonaktifkan. Hubungi Admin Lab.']);

        Notification::assertNothingSent();
    }

    public function test_code_is_stored_hashed_and_resend_waits_a_minute()
    {
        $code = $this->requestCode();

        $stored = DB::table('password_reset_codes')->where('email', 'rina@itpln.ac.id')->value('code');
        $this->assertNotSame($code, $stored);
        $this->assertTrue(Hash::check($code, $stored));

        $this->post(route('password.email'), ['email' => 'rina@itpln.ac.id'])->assertSessionHasErrors('email');

        $this->travel(61)->seconds();
        $this->post(route('password.email'), ['email' => 'rina@itpln.ac.id'])->assertRedirect(route('password.code'));
        Notification::assertSentToTimes($this->user, PasswordResetCodeNotification::class, 2);
    }

    public function test_password_can_be_reset_with_the_right_code()
    {
        $code = $this->requestCode();

        $this->get(route('password.code'))->assertInertia(fn (Assert $page) => $page->component('auth/reset-code')->where('email', 'rina@itpln.ac.id'));
        $this->get(route('password.reset'))->assertRedirect(route('password.request'));

        $this->post(route('password.code.verify'), ['code' => $code])->assertRedirect(route('password.reset'));
        $this->get(route('password.reset'))->assertInertia(fn (Assert $page) => $page->component('auth/reset-password')->where('email', 'rina@itpln.ac.id'));

        $this->post(route('password.update'), ['password' => 'kataSandi123', 'password_confirmation' => 'kataSandi123'])
            ->assertSessionHasNoErrors()->assertRedirect(route('login'));

        $this->assertTrue(Hash::check('kataSandi123', $this->user->fresh()->password));
        $this->assertDatabaseCount('password_reset_codes', 0);

        // Sesi reset sudah dipakai → tidak bisa diulang.
        $this->post(route('password.update'), ['password' => 'lainLagi123', 'password_confirmation' => 'lainLagi123'])->assertRedirect(route('password.request'));
    }

    public function test_wrong_codes_are_limited_and_codes_expire()
    {
        $code = $this->requestCode();
        $wrong = $code === '000000' ? '111111' : '000000';

        $this->post(route('password.code.verify'), ['code' => $wrong])->assertSessionHasErrors(['code' => 'Kode salah. Sisa 4 kali percobaan.']);
        foreach (range(1, 4) as $_) {
            $this->post(route('password.code.verify'), ['code' => $wrong]);
        }
        $this->post(route('password.code.verify'), ['code' => $code])->assertSessionHasErrors(['code' => 'Terlalu banyak kode salah. Minta kode baru.']);

        $this->travel(61)->seconds();
        $fresh = $this->requestCode();
        $this->travel(11)->minutes();
        $this->post(route('password.code.verify'), ['code' => $fresh])->assertSessionHasErrors(['code' => 'Kode sudah kedaluwarsa. Minta kode baru.']);
        $this->get(route('password.reset'))->assertRedirect(route('password.request'));
    }

    public function test_code_steps_need_a_pending_request()
    {
        $this->get(route('password.code'))->assertRedirect(route('password.request'));
        $this->post(route('password.code.verify'), ['code' => '123456'])->assertRedirect(route('password.request'));
    }
}
