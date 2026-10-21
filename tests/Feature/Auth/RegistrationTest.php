<?php

namespace Tests\Feature\Auth;

use App\Enums\Role;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Pendaftaran mandiri praktikan — hanya email kampus @itpln.ac.id + verifikasi email.
 */
class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return [
            'name' => 'Sinta Mahasiswa', 'nim' => '202331099', 'major' => 'S1 Teknik Informatika', 'cohort_year' => 2023,
            'email' => 'sinta@itpln.ac.id', 'phone' => '0812-3456-7890', 'password' => 'rahasia123', 'password_confirmation' => 'rahasia123', 'terms' => '1',
            ...$overrides,
        ];
    }

    public function test_the_registration_page_is_shown_and_linked_from_login()
    {
        $this->get(route('register'))->assertOk()->assertInertia(fn (Assert $page) => $page->component('auth/register')->where('domains', ['itpln.ac.id'])
            ->where('majors', ['S1 Teknik Informatika', 'S1 Sistem Informasi']));
        $this->get(route('login'))->assertInertia(fn (Assert $page) => $page->where('canRegister', true));
    }

    public function test_students_with_a_campus_email_can_register_and_must_verify_it()
    {
        Notification::fake();

        $this->post(route('register.store'), $this->payload(['email' => 'Sinta@ITPLN.ac.id']))->assertSessionHasNoErrors();

        $user = User::where('nim', '202331099')->sole();
        $this->assertSame(Role::Praktikan, $user->role);
        $this->assertSame('sinta@itpln.ac.id', $user->email);
        $this->assertSame('081234567890', $user->phone);
        $this->assertNull($user->email_verified_at);
        $this->assertTrue($user->is_active);
        Notification::assertSentTo($user, VerifyEmail::class);

        // Belum verifikasi → portal belum dapat dipakai.
        $this->get(route('praktikan.dashboard'))->assertRedirect(route('verification.notice'));
    }

    public function test_a_valid_phone_number_is_required()
    {
        foreach (['', '12345', '0212345678', '08abc1234567'] as $phone) {
            $this->post(route('register.store'), $this->payload(['phone' => $phone]))->assertSessionHasErrors('phone');
        }

        $this->assertSame(0, User::count());
    }

    public function test_non_campus_and_look_alike_domains_are_rejected()
    {
        foreach (['orang@gmail.com', 'orang@itpln.ac.id.evil.com', 'orang@palsu.itpln.ac.id', 'orang@itpln.ac.idx'] as $email) {
            $this->post(route('register.store'), $this->payload(['email' => $email]))->assertSessionHasErrors('email');
        }

        $this->assertSame(0, User::count());
    }

    public function test_duplicates_terms_and_password_rules_are_enforced()
    {
        User::factory()->create(['nim' => '202331099', 'email' => 'lama@itpln.ac.id']);

        $this->post(route('register.store'), $this->payload())->assertSessionHasErrors('nim');
        $this->post(route('register.store'), $this->payload(['nim' => '202331100', 'email' => 'lama@itpln.ac.id']))->assertSessionHasErrors('email');
        $this->post(route('register.store'), $this->payload(['nim' => '202331101', 'email' => 'baru@itpln.ac.id', 'terms' => null]))->assertSessionHasErrors('terms');
        $this->post(route('register.store'), $this->payload(['nim' => '202331103', 'email' => 'baru3@itpln.ac.id', 'major' => 'S1 Teknik Elektro']))->assertSessionHasErrors('major');
        $this->post(route('register.store'), $this->payload(['nim' => '202331102', 'email' => 'baru2@itpln.ac.id', 'password' => 'pendek', 'password_confirmation' => 'pendek']))->assertSessionHasErrors('password');
    }

    public function test_admins_can_close_registration_and_change_domains()
    {
        Setting::put(['registration_open' => false], null);

        $this->get(route('register'))->assertNotFound();
        $this->post(route('register.store'), $this->payload())->assertSessionHasErrors('email');
        $this->get(route('login'))->assertInertia(fn (Assert $page) => $page->where('canRegister', false));

        Setting::put(['registration_open' => true, 'registration_domains' => 'itpln.ac.id, student.itpln.ac.id'], null);
        $this->post(route('register.store'), $this->payload(['email' => 'sinta@student.itpln.ac.id']))->assertSessionHasNoErrors();
    }

    public function test_the_admin_settings_page_saves_registration_options()
    {
        $this->actingAs(User::factory()->admin()->create())->put(route('admin.system-settings.update'), [
            'idle_minutes' => 30, 'limit_pdf_mb' => 10, 'limit_zip_mb' => 20, 'limit_image_mb' => 5,
            'registration_open' => '0', 'registration_domains' => '@ITPLN.ac.id',
        ])->assertSessionHasNoErrors();

        $this->assertFalse(Setting::value('registration_open'));
        $this->assertSame('itpln.ac.id', Setting::value('registration_domains'));
    }
}
