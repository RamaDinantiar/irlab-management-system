<?php

namespace Tests\Feature\Admin;

use App\Enums\Position;
use App\Enums\Role;
use App\Models\User;
use App\Notifications\AccountCredentialsNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer as XlsxWriter;
use Tests\TestCase;

/**
 * US-D04 — Mengelola pengguna; PRD A1 — import akun praktikan.
 */
class UserTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->admin = User::factory()->admin()->create();
        $this->actingAs($this->admin);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'role' => 'praktikan',
            'position' => 'none',
            'nim' => '202331044',
            'name' => 'Rama Dinantiar',
            'email' => 'rama@itpln.ac.id',
            'major' => 'S1 Teknik Informatika',
            'cohort_year' => 2023,
            ...$overrides,
        ];
    }

    private function csv(string $content): UploadedFile
    {
        return UploadedFile::fake()->createWithContent('praktikan.csv', $content);
    }

    public function test_only_admins_can_manage_users()
    {
        $this->actingAs(User::factory()->asisten()->create())->get(route('admin.users.index'))->assertForbidden();
    }

    public function test_the_index_filters_and_paginates()
    {
        User::factory()->count(30)->create();
        User::factory()->asisten()->create(['name' => 'Dimas Qwertyasisten']);

        $this->get(route('admin.users.index'))
            ->assertInertia(fn (Assert $page) => $page->has('users.data', 25)->where('users.total', 32));

        $this->get(route('admin.users.index', ['role' => 'asisten']))
            ->assertInertia(fn (Assert $page) => $page->has('users.data', 1)->where('users.data.0.name', 'Dimas Qwertyasisten'));

        $this->get(route('admin.users.index', ['search' => 'Qwerty']))
            ->assertInertia(fn (Assert $page) => $page->has('users.data', 1));
    }

    public function test_new_accounts_get_a_temporary_password_by_email()
    {
        $this->post(route('admin.users.store'), $this->payload())
            ->assertRedirect(route('admin.users.index'))
            ->assertInertiaFlash('credentials.login', '202331044');

        $user = User::where('nim', '202331044')->sole();
        $this->assertTrue($user->must_change_password);
        $this->assertNotNull($user->email_verified_at, 'Akun resmi lab tidak perlu verifikasi email.');
        $this->assertSame(Role::Praktikan, $user->role);
        Notification::assertSentTo($user, AccountCredentialsNotification::class);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.created', 'auditable_id' => $user->id]);
    }

    public function test_the_issued_temporary_password_works_and_forces_a_change()
    {
        $password = null;
        $this->post(route('admin.users.store'), $this->payload());
        Notification::assertSentTo(User::where('nim', '202331044')->sole(), AccountCredentialsNotification::class, function ($notification, $channels, $notifiable) use (&$password) {
            $password = (fn () => $this->temporaryPassword)->call($notification);

            return true;
        });

        auth()->logout();
        $this->post(route('login.store'), ['login' => '202331044', 'password' => $password]);
        $this->assertAuthenticated();
        $this->get(route('dashboard'))->assertRedirect(route('password.change'));
    }

    public function test_nim_is_required_for_students_and_assistants_but_not_admins()
    {
        $this->post(route('admin.users.store'), $this->payload(['nim' => '']))->assertSessionHasErrors('nim');
        $this->post(route('admin.users.store'), $this->payload(['nim' => '', 'role' => 'admin', 'email' => 'kalab@itpln.ac.id']))
            ->assertSessionHasNoErrors();
    }

    public function test_positions_are_only_for_assistants()
    {
        $this->post(route('admin.users.store'), $this->payload(['position' => 'sekretaris']))
            ->assertSessionHasErrors(['position' => 'Jabatan Sekretaris/Bendahara hanya untuk Asisten.']);

        $this->post(route('admin.users.store'), $this->payload(['role' => 'asisten', 'position' => 'sekretaris']))
            ->assertSessionHasNoErrors();
        $this->assertSame(Position::Sekretaris, User::where('nim', '202331044')->sole()->position);
    }

    public function test_role_changes_are_audited()
    {
        $user = User::factory()->create();

        $this->put(route('admin.users.update', $user), $this->payload([
            'nim' => $user->nim, 'email' => $user->email, 'role' => 'asisten', 'position' => 'bendahara',
        ]))->assertSessionHasNoErrors();

        $this->assertSame(Role::Asisten, $user->fresh()->role);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.role_changed', 'auditable_id' => $user->id]);
    }

    public function test_admins_cannot_demote_or_deactivate_themselves()
    {
        $this->put(route('admin.users.update', $this->admin), $this->payload([
            'nim' => null, 'email' => $this->admin->email, 'role' => 'asisten',
        ]))->assertSessionHasErrors('role');

        $this->post(route('admin.users.activation', $this->admin), ['active' => '0'])->assertForbidden();
        $this->assertTrue($this->admin->fresh()->is_active);
    }

    public function test_deactivating_ends_every_session()
    {
        $user = User::factory()->create(['remember_token' => 'old-token']);
        DB::table('sessions')->insert(['id' => 'abc', 'user_id' => $user->id, 'payload' => '', 'last_activity' => time()]);

        $this->post(route('admin.users.activation', $user), ['active' => '0'])->assertRedirect();

        $this->assertFalse($user->fresh()->is_active);
        $this->assertDatabaseMissing('sessions', ['user_id' => $user->id]);
        $this->assertNotSame('old-token', $user->fresh()->remember_token);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.deactivated']);

        $this->post(route('admin.users.activation', $user), ['active' => '1']);
        $this->assertTrue($user->fresh()->is_active);
    }

    public function test_reset_password_issues_a_new_temporary_password()
    {
        $user = User::factory()->create();
        $oldHash = $user->password;

        $this->post(route('admin.users.password', $user))->assertRedirect();

        $user->refresh();
        $this->assertNotSame($oldHash, $user->password);
        $this->assertTrue($user->must_change_password);
        $this->assertFalse(Hash::check('password', $user->password));
        Notification::assertSentTo($user, AccountCredentialsNotification::class);
    }

    public function test_csv_import_creates_valid_rows_and_reports_failed_rows()
    {
        User::factory()->create(['nim' => '202331099']);

        $file = $this->csv(implode("\n", [
            'NIM,Nama,Email,Jurusan,Angkatan',
            '202331001,Rina Praktikan,rina@itpln.ac.id,S1 Teknik Informatika,2023',
            '202331002,Bagas Pratama,bagas@itpln.ac.id,,2023',
            '202331099,Sudah Ada,ada@itpln.ac.id,,2023',      // NIM sudah terdaftar
            'abc,Salah NIM,salah@itpln.ac.id,,2023',           // NIM bukan angka
            '202331003,Email Ganda,rina@itpln.ac.id,,2023',    // email ganda di file
            ',,,,',                                            // baris kosong dilewati
        ]));

        $this->post(route('admin.users.import'), ['file' => $file])
            ->assertRedirect(route('admin.users.index'))
            ->assertInertiaFlash('importResult.created', 2)
            ->assertInertiaFlash('importResult.failed.0.row', 4)
            ->assertInertiaFlash('importResult.failed.1.row', 5)
            ->assertInertiaFlash('importResult.failed.2.row', 6);

        $this->assertDatabaseHas('users', ['nim' => '202331001', 'role' => 'praktikan', 'must_change_password' => true]);
        $this->assertDatabaseHas('users', ['nim' => '202331002', 'major' => null]);
        Notification::assertSentTimes(AccountCredentialsNotification::class, 2);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.imported']);
    }

    public function test_xlsx_import_with_english_headers()
    {
        $path = tempnam(sys_get_temp_dir(), 'import').'.xlsx';
        $writer = new XlsxWriter;
        $writer->openToFile($path);
        $writer->addRow(Row::fromValues(['nim', 'name', 'email', 'major', 'cohort_year']));
        $writer->addRow(Row::fromValues(['202331010', 'Siti Aminah', 'siti@itpln.ac.id', 'S1 Sistem Informasi', 2024]));
        $writer->close();

        $this->post(route('admin.users.import'), ['file' => new UploadedFile($path, 'praktikan.xlsx', null, null, true)])
            ->assertInertiaFlash('importResult.created', 1);

        $this->assertDatabaseHas('users', ['nim' => '202331010', 'major' => 'S1 Sistem Informasi', 'cohort_year' => 2024]);
    }

    public function test_unrecognized_headers_are_rejected()
    {
        $this->post(route('admin.users.import'), ['file' => $this->csv("foo,bar\n1,2")])
            ->assertSessionHasErrors('file');
    }

    public function test_the_import_template_can_be_downloaded()
    {
        $response = $this->get(route('admin.users.import-template'))->assertOk();

        $this->assertStringStartsWith('nim,nama,email,jurusan,angkatan', $response->streamedContent());
    }
}
