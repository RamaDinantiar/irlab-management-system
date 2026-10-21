<?php

namespace Tests\Feature\Admin;

use App\Enums\SemesterStatus;
use App\Models\AuditLog;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * US-D01 — Membuat semester baru, mengaktifkan, mengarsipkan, hapus permanen.
 */
class SemesterTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->actingAs($this->admin);
    }

    public function test_only_admins_can_manage_semesters()
    {
        $this->actingAs(User::factory()->asisten()->create())
            ->get(route('admin.semesters.index'))
            ->assertForbidden();
    }

    public function test_the_index_lists_semesters_with_the_active_one_first()
    {
        Semester::factory()->create(['name' => 'Genap 2026/2027', 'start_date' => '2027-02-15', 'end_date' => '2027-06-18']);
        Semester::factory()->active()->create(['name' => 'Ganjil 2026/2027']);
        Semester::factory()->archived()->create(['name' => 'Genap 2025/2026', 'start_date' => '2026-02-16', 'end_date' => '2026-06-19']);

        $this->get(route('admin.semesters.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/semesters/index')
                ->has('semesters', 3)
                ->where('semesters.0.name', 'Ganjil 2026/2027')
                ->where('semesters.0.status', 'active')
                ->where('semesters.1.status', 'draft')
                ->where('semesters.2.status', 'archived')
                ->where('semesters.2.canEdit', false)
            );
    }

    public function test_a_new_semester_starts_as_draft()
    {
        $this->post(route('admin.semesters.store'), [
            'name' => 'Ganjil 2026/2027',
            'start_date' => '2026-08-24',
            'end_date' => '2026-12-18',
        ])->assertRedirect(route('admin.semesters.index'));

        $semester = Semester::sole();
        $this->assertSame(SemesterStatus::Draft, $semester->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'semester.created', 'auditable_id' => $semester->id, 'user_id' => $this->admin->id]);
    }

    public function test_semester_input_is_validated()
    {
        Semester::factory()->create(['name' => 'Ganjil 2026/2027']);

        $this->post(route('admin.semesters.store'), [
            'name' => 'Ganjil 2026/2027',
            'start_date' => '2026-12-18',
            'end_date' => '2026-08-24',
        ])->assertSessionHasErrors([
            'name' => 'Nama semester sudah digunakan.',
            'end_date' => 'Tanggal selesai harus setelah tanggal mulai.',
        ]);
    }

    public function test_activating_archives_the_previous_semester()
    {
        $previous = Semester::factory()->active()->create();
        $next = Semester::factory()->create();

        $this->post(route('admin.semesters.activate', $next))->assertRedirect();

        $this->assertSame(SemesterStatus::Active, $next->fresh()->status);
        $this->assertSame(SemesterStatus::Archived, $previous->fresh()->status);
        $this->assertNotNull($previous->fresh()->archived_at);
        $this->assertSame(1, Semester::active()->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'semester.activated', 'auditable_id' => $next->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'semester.archived', 'auditable_id' => $previous->id]);
    }

    public function test_only_draft_semesters_can_be_activated()
    {
        $archived = Semester::factory()->archived()->create();

        $this->post(route('admin.semesters.activate', $archived))
            ->assertSessionHasErrors('semester');

        $this->assertSame(SemesterStatus::Archived, $archived->fresh()->status);
    }

    public function test_archived_semesters_are_read_only()
    {
        $archived = Semester::factory()->archived()->create(['name' => 'Genap 2025/2026']);

        $this->put(route('admin.semesters.update', $archived), [
            'name' => 'Diubah',
            'start_date' => '2026-02-16',
            'end_date' => '2026-06-19',
        ])->assertForbidden();

        $this->assertSame('Genap 2025/2026', $archived->fresh()->name);
    }

    public function test_draft_and_active_semesters_can_be_edited()
    {
        $semester = Semester::factory()->active()->create();

        $this->put(route('admin.semesters.update', $semester), [
            'name' => 'Ganjil 2026/2027 (revisi)',
            'start_date' => '2026-08-31',
            'end_date' => '2026-12-18',
        ])->assertRedirect();

        $this->assertSame('Ganjil 2026/2027 (revisi)', $semester->fresh()->name);
        $this->assertSame(1, AuditLog::where('action', 'semester.updated')->count());
    }

    public function test_purging_requires_an_archive_older_than_two_years_and_typed_confirmation()
    {
        $recent = Semester::factory()->archived()->create(['name' => 'Genap 2025/2026', 'end_date' => now()->subYear()->toDateString()]);
        $old = Semester::factory()->archived()->create(['name' => 'Ganjil 2022/2023', 'start_date' => '2022-08-22', 'end_date' => '2022-12-16']);

        // Arsip berumur < 2 tahun tidak boleh dihapus.
        $this->delete(route('admin.semesters.destroy', $recent), ['confirmation' => $recent->name])->assertForbidden();

        // Konfirmasi salah ditolak.
        $this->delete(route('admin.semesters.destroy', $old), ['confirmation' => 'ganjil 2022/2023'])
            ->assertSessionHasErrors('confirmation');
        $this->assertModelExists($old);

        $this->delete(route('admin.semesters.destroy', $old), ['confirmation' => 'Ganjil 2022/2023'])->assertRedirect();
        $this->assertModelMissing($old);
        $this->assertDatabaseHas('audit_logs', ['action' => 'semester.purged']);
    }

    public function test_active_and_draft_semesters_cannot_be_purged()
    {
        $active = Semester::factory()->active()->create(['start_date' => '2019-08-01', 'end_date' => '2019-12-01']);

        $this->delete(route('admin.semesters.destroy', $active), ['confirmation' => $active->name])->assertForbidden();
    }

    public function test_audit_logs_are_append_only()
    {
        $log = AuditLog::record('test.action');

        $log->action = 'changed';
        $this->assertFalse($log->save());
        $this->assertFalse($log->delete());
        $this->assertSame('test.action', $log->fresh()->action);
    }

    public function test_the_active_semester_is_shared_with_every_page()
    {
        Semester::factory()->active()->create(['name' => 'Ganjil 2026/2027']);

        $this->get(route('admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('activeSemester.name', 'Ganjil 2026/2027'));
    }
}
