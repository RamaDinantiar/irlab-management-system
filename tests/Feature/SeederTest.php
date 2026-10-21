<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Database\Seeders\AdminSeeder;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\MeetingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Tests\TestCase;

class SeederTest extends TestCase
{
    use RefreshDatabase;

    private function inProduction(): void
    {
        $this->app['env'] = 'production';
    }

    public function test_admin_seeder_creates_one_admin_that_must_change_password()
    {
        config(['lab.admin' => ['name' => 'Admin Lab IR', 'email' => 'Admin@ITPLN.ac.id', 'password' => 'RahasiaKuat2026']]);

        $this->seed(AdminSeeder::class);

        $admin = User::sole();
        $this->assertSame('admin@itpln.ac.id', $admin->email);
        $this->assertSame(Role::Admin, $admin->role);
        $this->assertTrue($admin->must_change_password);
        $this->assertTrue(Hash::check('RahasiaKuat2026', $admin->password));
    }

    public function test_admin_seeder_generates_a_password_when_none_is_given()
    {
        config(['lab.admin' => ['name' => 'Admin Lab IR', 'email' => 'admin@itpln.ac.id', 'password' => null]]);

        $this->seed(AdminSeeder::class);

        $admin = User::sole();
        $this->assertFalse(Hash::check('', $admin->password));
        $this->assertTrue($admin->must_change_password);
    }

    public function test_admin_seeder_is_idempotent_and_never_overwrites_the_password()
    {
        config(['lab.admin' => ['name' => 'Admin Lab IR', 'email' => 'admin@itpln.ac.id', 'password' => 'RahasiaKuat2026']]);
        $this->seed(AdminSeeder::class);
        $hash = User::sole()->password;

        config(['lab.admin.password' => 'PasswordLain2027']);
        $this->seed(AdminSeeder::class);

        $this->assertSame(1, User::count());
        $this->assertSame($hash, User::sole()->password);
    }

    public function test_admin_seeder_rejects_a_missing_email_or_weak_password()
    {
        config(['lab.admin' => ['name' => 'Admin Lab IR', 'email' => 'admin@itpln.ac.id', 'password' => 'password']]);

        try {
            $this->seed(AdminSeeder::class);
            $this->fail('Kata sandi lemah seharusnya ditolak.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('password', $e->errors());
        }

        config(['lab.admin' => ['name' => 'Admin Lab IR', 'email' => null, 'password' => null]]);
        $this->expectException(ValidationException::class);
        $this->seed(AdminSeeder::class);
    }

    public function test_demo_seeders_refuse_to_run_in_production()
    {
        $this->inProduction();

        $this->expectException(RuntimeException::class);
        $this->artisan('db:seed', ['--class' => MeetingSeeder::class, '--force' => true]);
    }

    public function test_the_default_seeder_only_creates_the_admin_in_production()
    {
        $this->inProduction();
        config(['lab.admin' => ['name' => 'Admin Lab IR', 'email' => 'admin@itpln.ac.id', 'password' => null]]);

        $this->artisan('db:seed', ['--class' => DatabaseSeeder::class, '--force' => true])->assertSuccessful();

        $this->assertSame(['admin@itpln.ac.id'], User::pluck('email')->all());
        $this->assertDatabaseMissing('users', ['email' => 'admin@irlab.test']);
    }
}
