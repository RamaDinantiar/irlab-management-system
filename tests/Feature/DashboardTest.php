<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, array{string}>
     */
    public static function roles(): array
    {
        return [
            'praktikan' => ['praktikan'],
            'asisten' => ['asisten'],
            'admin' => ['admin'],
        ];
    }

    private function userWithRole(string $role): User
    {
        return match ($role) {
            'praktikan' => User::factory()->create(),
            'asisten' => User::factory()->asisten()->create(),
            'admin' => User::factory()->admin()->create(),
        };
    }

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    #[DataProvider('roles')]
    public function test_dashboard_redirects_to_the_users_role_dashboard(string $role)
    {
        $this->actingAs($this->userWithRole($role));

        $this->get(route('dashboard'))->assertRedirect(route("{$role}.dashboard"));
    }

    #[DataProvider('roles')]
    public function test_users_can_visit_their_role_dashboard(string $role)
    {
        $this->actingAs($this->userWithRole($role));

        $this->get(route("{$role}.dashboard"))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component("{$role}/dashboard"));
    }

    public function test_users_cannot_open_another_roles_area()
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('asisten.dashboard'))->assertForbidden();
        $this->get(route('admin.dashboard'))->assertForbidden();
        $this->get('/admin/users')->assertForbidden();
    }

    public function test_unbuilt_menu_pages_render_the_coming_soon_page()
    {
        $this->actingAs(User::factory()->asisten()->create());

        $this->get('/asisten/grade/post-test')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('coming-soon'));
    }
}
