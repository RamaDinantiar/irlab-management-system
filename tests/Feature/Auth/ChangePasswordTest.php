<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * FR-AUTH-05: akun hasil import wajib mengganti password sementara.
 */
class ChangePasswordTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_with_a_temporary_password_are_sent_to_the_change_password_page()
    {
        $this->actingAs(User::factory()->create(['must_change_password' => true]));

        $this->get(route('praktikan.dashboard'))->assertRedirect(route('password.change'));
        $this->get(route('password.change'))->assertOk();
    }

    public function test_users_without_a_temporary_password_skip_the_page()
    {
        $this->actingAs(User::factory()->create());

        $this->get(route('password.change'))->assertRedirect(route('praktikan.dashboard'));
    }

    public function test_the_password_can_be_changed()
    {
        $user = User::factory()->create(['must_change_password' => true]);

        $this->actingAs($user)
            ->put(route('password.change.update'), [
                'password' => 'rahasia123',
                'password_confirmation' => 'rahasia123',
            ])
            ->assertRedirect(route('praktikan.dashboard'));

        $user->refresh();
        $this->assertFalse($user->must_change_password);
        $this->assertTrue(Hash::check('rahasia123', $user->password));
    }

    public function test_the_new_password_must_differ_from_the_temporary_one()
    {
        $user = User::factory()->create([
            'password' => 'sementara1',
            'must_change_password' => true,
        ]);

        $this->actingAs($user)
            ->put(route('password.change.update'), [
                'password' => 'sementara1',
                'password_confirmation' => 'sementara1',
            ])
            ->assertSessionHasErrors('password');
    }

    public function test_the_new_password_must_contain_letters_and_numbers()
    {
        $this->actingAs(User::factory()->create(['must_change_password' => true]))
            ->put(route('password.change.update'), [
                'password' => 'abcdefgh',
                'password_confirmation' => 'abcdefgh',
            ])
            ->assertSessionHasErrors('password');
    }
}
