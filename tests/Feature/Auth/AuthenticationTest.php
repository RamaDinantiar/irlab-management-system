<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered()
    {
        $response = $this->get(route('login'));

        $response->assertOk();
    }

    public function test_home_redirects_to_login()
    {
        $this->get(route('home'))->assertRedirect('/login');
    }

    public function test_users_can_authenticate_with_email()
    {
        $user = User::factory()->create();

        $response = $this->post(route('login.store'), [
            'login' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_users_can_authenticate_with_nim()
    {
        $user = User::factory()->create(['nim' => '202331044']);

        $this->post(route('login.store'), [
            'login' => '202331044',
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
    }

    public function test_wrong_password_shows_a_generic_error()
    {
        $user = User::factory()->create();

        $this->post(route('login.store'), [
            'login' => $user->email,
            'password' => 'wrong-password',
        ])->assertSessionHasErrors(['login' => 'NIM/Email atau kata sandi salah.']);

        $this->assertGuest();
    }

    public function test_unknown_account_shows_the_same_generic_error()
    {
        $this->post(route('login.store'), [
            'login' => '999999999',
            'password' => 'password',
        ])->assertSessionHasErrors(['login' => 'NIM/Email atau kata sandi salah.']);

        $this->assertGuest();
    }

    public function test_inactive_users_cannot_authenticate()
    {
        $user = User::factory()->create(['is_active' => false]);

        $this->post(route('login.store'), [
            'login' => $user->email,
            'password' => 'password',
        ])->assertSessionHasErrors(['login' => 'NIM/Email atau kata sandi salah.']);

        $this->assertGuest();
    }

    public function test_deactivated_users_lose_their_running_session()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $user->forceFill(['is_active' => false])->save();

        $this->get(route('dashboard'))->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_remember_me_lasts_fourteen_days()
    {
        $user = User::factory()->create();

        $response = $this->post(route('login.store'), [
            'login' => $user->email,
            'password' => 'password',
            'remember' => 'on',
        ]);

        $cookie = collect($response->headers->getCookies())
            ->first(fn ($cookie) => $cookie->getName() === Auth::guard('web')->getRecallerName());

        $this->assertNotNull($cookie);
        $this->assertEqualsWithDelta(now()->addDays(14)->getTimestamp(), $cookie->getExpiresTime(), 60);
        $this->assertTrue(session('auth.remembered'));
    }

    public function test_users_can_logout()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post(route('logout'));

        $response->assertRedirect(route('home'));

        $this->assertGuest();
    }

    public function test_users_are_rate_limited()
    {
        $user = User::factory()->create();

        RateLimiter::increment(md5('login'.implode('|', [$user->email, '127.0.0.1'])), amount: 5);

        $response = $this->post(route('login.store'), [
            'login' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertTooManyRequests();
    }

    public function test_keep_alive_extends_the_session()
    {
        $this->actingAs(User::factory()->create())
            ->post(route('session.keep-alive'))
            ->assertNoContent();
    }

    public function test_forbidden_pages_render_a_friendly_error_page()
    {
        $this->actingAs(User::factory()->create(['name' => 'Rina']))
            ->get(route('admin.dashboard'))
            ->assertForbidden()
            ->assertInertia(fn (Assert $page) => $page->component('error')->where('status', 403)
                ->where('signedInAs', ['name' => 'Rina', 'role' => 'Praktikan']));
    }
}
