<?php

namespace Tests\Feature\Admin;

use App\Models\AuditLog;
use App\Models\HonorRate;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * PRD 8.2 (Audit Log) & FR-ADM-10 (Pengaturan Sistem).
 */
class SystemTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create();
    }

    public function test_audit_logs_are_filterable_and_admin_only()
    {
        $this->actingAs($this->admin);
        AuditLog::record('grade.saved', null, ['score' => 70], ['score' => 80]);
        AuditLog::record('seat.moved', null, ['seat' => 'PC-01'], ['seat' => 'PC-02']);

        $this->get(route('admin.audit-logs.index', ['module' => 'seat']))
            ->assertInertia(fn (Assert $page) => $page->component('admin/audit-logs')->has('logs.data', 1)->where('logs.data.0.after.seat', 'PC-02'));

        $this->actingAs(User::factory()->asisten()->create())->get(route('admin.audit-logs.index'))->assertForbidden();
    }

    public function test_settings_are_saved_audited_and_applied()
    {
        $payload = ['idle_minutes' => 45, 'limit_pdf_mb' => 15, 'limit_zip_mb' => 30, 'limit_image_mb' => 4];

        $this->actingAs($this->admin)->put(route('admin.system-settings.update'), $payload)->assertSessionHasNoErrors();
        $this->assertSame(45, Setting::value('idle_minutes'));
        $this->assertTrue(AuditLog::where('action', 'settings.updated')->exists());

        Setting::apply();
        $this->assertSame(45, config('session.lifetime'));
        $this->assertSame(15 * 1024, config('lab.files.limits.pdf'));

        $this->put(route('admin.system-settings.update'), [...$payload, 'idle_minutes' => 1])->assertSessionHasErrors('idle_minutes');
    }

    public function test_honor_rates_keep_history()
    {
        $this->actingAs($this->admin)->post(route('admin.honor-rates.store'), ['rate_per_hour' => 30000, 'effective_from' => now()->toDateString()])->assertSessionHasNoErrors();
        HonorRate::create(['rate_per_hour' => 20000, 'effective_from' => now()->subYear()->toDateString()]);

        $this->assertSame(30000, HonorRate::rateOn(now()->toDateString()));
        $this->assertSame(20000, HonorRate::rateOn(now()->subMonths(6)->toDateString()));
    }
}
