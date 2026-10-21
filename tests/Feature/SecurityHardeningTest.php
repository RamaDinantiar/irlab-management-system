<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\SafeRedirect;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_responses_carry_security_headers()
    {
        $this->get(route('login'))
            ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
            ->assertHeader('Content-Security-Policy')
            ->assertHeaderMissing('Strict-Transport-Security');
    }

    public function test_hsts_is_sent_over_https()
    {
        $this->get('https://localhost/login')->assertHeader('Strict-Transport-Security');
    }

    public function test_forgot_password_is_rate_limited_per_email_and_ip()
    {
        Notification::fake();
        $user = User::factory()->create(['email' => 'rina@itpln.ac.id']);

        for ($i = 0; $i < 3; $i++) {
            $this->post(route('password.email'), ['email' => $user->email])->assertSessionHasNoErrors();
            $this->travel(61)->seconds(); // jeda kirim ulang kode
        }

        $this->post(route('password.email'), ['email' => $user->email])
            ->assertSessionHasErrors(['email' => 'Terlalu banyak percobaan. Coba lagi dalam 7 menit.']);

        // Email lain dari IP yang sama masih boleh (praktikan satu kampus berbagi IP).
        User::factory()->create(['email' => 'lain@itpln.ac.id']);
        $this->post(route('password.email'), ['email' => 'lain@itpln.ac.id'])->assertSessionHasNoErrors();
    }

    public function test_forgot_password_is_capped_per_ip()
    {
        Notification::fake();

        // Email tak terdaftar tetap dihitung: mencegah menebak email terdaftar secara massal.
        for ($i = 0; $i < 20; $i++) {
            $this->post(route('password.email'), ['email' => "orang{$i}@itpln.ac.id"])
                ->assertSessionHasErrors(['email' => 'Email ini belum terdaftar di IR Lab. Periksa kembali penulisannya atau daftar akun terlebih dahulu.']);
        }

        $this->post(route('password.email'), ['email' => 'orang99@itpln.ac.id'])
            ->assertSessionHasErrors(['email' => 'Terlalu banyak percobaan. Coba lagi dalam 60 menit.']);
    }

    public function test_notification_links_only_redirect_inside_the_site()
    {
        $this->assertTrue(SafeRedirect::isInternalPath('/praktikan/tasks/5'));

        foreach (['//evil.test', '/\\evil.test', "/\tevil", 'https://evil.test', 'evil', null] as $url) {
            $this->assertFalse(SafeRedirect::isInternalPath($url), (string) $url);
        }

        $user = User::factory()->create();
        $id = (string) Str::uuid();
        $user->notifications()->create(['id' => $id, 'type' => 'test', 'data' => ['url' => '/\\evil.test']]);

        $this->actingAs($user)->from('/notifications')->get(route('notifications.read', $id))
            ->assertRedirect('/notifications');
    }

    public function test_changing_password_signs_out_other_devices_only()
    {
        $user = User::factory()->create();
        $token = $user->remember_token;
        DB::table('sessions')->insert(['id' => 'perangkat-lain', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);

        $this->actingAs($user)
            ->from(route('security.edit'))
            ->put(route('user-password.update'), [
                'current_password' => 'password',
                'password' => 'kataSandi123',
                'password_confirmation' => 'kataSandi123',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('sessions', ['id' => 'perangkat-lain']);
        $this->assertNotSame($token, $user->fresh()->remember_token);
        $this->assertAuthenticatedAs($user);
    }

    public function test_first_login_password_change_signs_out_other_devices()
    {
        $user = User::factory()->create(['must_change_password' => true]);
        DB::table('sessions')->insert(['id' => 'perangkat-lain', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);

        $this->actingAs($user)->put(route('password.change.update'), [
            'password' => 'kataSandi123',
            'password_confirmation' => 'kataSandi123',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseMissing('sessions', ['id' => 'perangkat-lain']);
        $this->assertAuthenticatedAs($user);
    }

    public function test_password_reset_signs_out_every_device()
    {
        $user = User::factory()->create(['email' => 'rina@itpln.ac.id']);
        DB::table('sessions')->insert(['id' => 'perangkat-lain', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);

        $this->withSession(['password_reset.verified' => ['email' => $user->email, 'until' => now()->addMinutes(5)->timestamp]])
            ->post(route('password.update'), [
                'password' => 'kataSandi123',
                'password_confirmation' => 'kataSandi123',
            ])->assertSessionHasNoErrors()->assertRedirect(route('login'));

        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
    }
}
