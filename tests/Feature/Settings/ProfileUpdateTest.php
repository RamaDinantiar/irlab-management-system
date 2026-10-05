<?php

namespace Tests\Feature\Settings;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_page_is_displayed()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->get(route('profile.edit'));

        $response->assertOk();
    }

    public function test_profile_information_can_be_updated()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => 'test@example.com',
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $user->refresh();

        $this->assertSame('Test User', $user->name);
        $this->assertSame('test@example.com', $user->email);
        $this->assertNull($user->email_verified_at);
    }

    public function test_email_verification_status_is_unchanged_when_the_email_address_is_unchanged()
    {
        $user = User::factory()->create();

        $response = $this
            ->actingAs($user)
            ->patch(route('profile.update'), [
                'name' => 'Test User',
                'email' => $user->email,
            ]);

        $response
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('profile.edit'));

        $this->assertNotNull($user->refresh()->email_verified_at);
    }

    public function test_users_cannot_delete_their_own_account()
    {
        // Akun dikelola Admin (nonaktifkan, bukan hapus) agar riwayat nilai & submission tetap utuh.
        $this->actingAs(User::factory()->create())->delete('/settings/profile')->assertStatus(405);
    }

    public function test_users_complete_study_program_but_cannot_change_their_nim()
    {
        $user = User::factory()->create(['nim' => '202300123', 'major' => null]);

        $this->actingAs($user)->patch(route('profile.update'), [
            'name' => $user->name, 'email' => $user->email, 'major' => 'S1 Sistem Informasi', 'cohort_year' => 2023, 'nim' => '999',
        ])->assertSessionHasNoErrors();

        $user->refresh();
        $this->assertSame('S1 Sistem Informasi', $user->major);
        $this->assertSame('202300123', $user->nim);
    }
}
