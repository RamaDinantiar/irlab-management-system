<?php

namespace Tests\Feature\Admin;

use App\Models\Course;
use App\Models\Semester;
use App\Models\User;
use App\Support\Dashboard\AdminDashboardData;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_dashboard_receives_the_data_contract()
    {
        Course::factory()->for(Semester::factory()->active())->pending()->create();

        $this->actingAs(User::factory()->admin()->create())
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/dashboard')
                ->has('dashboard', fn (Assert $dashboard) => $dashboard
                    ->hasAll(['isSample', 'semester', 'counts', 'reportCompliance', 'approvals', 'gradingQueue', 'activePrograms', 'auditLogs'])
                    ->has('reportCompliance', fn (Assert $c) => $c->hasAll(['month', 'onTime', 'submitted', 'expected', 'target']))
                    ->has('approvals.0', fn (Assert $a) => $a->hasAll(['id', 'type', 'name', 'detail', 'requestedBy', 'requestedAt', 'href']))
                )
            );
    }

    public function test_semester_week_is_clamped_to_the_semester()
    {
        $semester = Semester::factory()->active()->make(['start_date' => '2026-08-24', 'end_date' => '2026-12-18']);
        $week = fn (string $date) => AdminDashboardData::semester($semester, CarbonImmutable::parse($date, 'Asia/Jakarta'));

        $this->assertSame(1, $week('2026-08-01')['week']);
        $this->assertSame(1, $week('2026-08-24')['week']);
        $this->assertSame(7, $week('2026-10-05')['week']);

        $end = $week('2027-01-15');
        $this->assertSame($end['totalWeeks'], $end['week']);
    }

    public function test_dashboard_shows_the_real_active_semester()
    {
        Semester::factory()->active()->create(['name' => 'Ganjil 2026/2027']);

        $this->assertSame('Ganjil 2026/2027', AdminDashboardData::for()['semester']['name']);
    }

    public function test_dashboard_without_an_active_semester()
    {
        Semester::factory()->create();

        $this->assertNull(AdminDashboardData::for()['semester']);
    }

    public function test_compliance_month_is_in_indonesian()
    {
        $data = AdminDashboardData::for(CarbonImmutable::parse('2026-10-05', 'Asia/Jakarta'));

        $this->assertSame('Oktober 2026', $data['reportCompliance']['month']);
    }
}
