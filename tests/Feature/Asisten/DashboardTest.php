<?php

namespace Tests\Feature\Asisten;

use App\Enums\Position;
use App\Models\Course;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\User;
use App\Support\Dashboard\AsistenDashboardData;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_dashboard_receives_the_data_contract()
    {
        $this->actingAs(User::factory()->asisten()->create())
            ->get(route('asisten.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('asisten/dashboard')
                ->has('dashboard', fn (Assert $dashboard) => $dashboard
                    ->hasAll(['isSample', 'pendingReports', 'pendingGrading', 'nextShift', 'alerts', 'week', 'gradingQueue', 'activities'])
                    ->has('week.events.0', fn (Assert $event) => $event
                        ->hasAll(['id', 'type', 'title', 'subtitle', 'room', 'day', 'start', 'end', 'color', 'running'])
                    )
                )
            );
    }

    public function test_pending_grading_counts_only_pre_and_post_tests()
    {
        $data = AsistenDashboardData::for(User::factory()->asisten()->make());

        // Figma: "24 Pre/Post-Test belum dinilai" — laporan praktikum tidak dihitung.
        $this->assertSame(24, $data['pendingGrading']);
    }

    public function test_position_specific_alerts()
    {
        $keys = fn (User $user) => array_column(AsistenDashboardData::for($user)['alerts'], 'key');

        $this->assertNotContains('to-verify', $keys(User::factory()->asisten()->make()));
        $this->assertContains('to-verify', $keys(User::factory()->asisten(Position::Sekretaris)->make()));
        $this->assertContains('honor', $keys(User::factory()->asisten(Position::Bendahara)->make()));
    }

    public function test_week_uses_the_assistants_real_classes_and_flags_the_running_one()
    {
        $asisten = User::factory()->asisten()->create();
        $course = Course::factory()->for(Semester::factory()->active())->create(['name' => 'Machine Learning']);
        LabClass::factory()->for($course)->create(['semester_id' => $course->semester_id, 'name' => 'Kelas A', 'day_of_week' => 1, 'start_time' => '07:20', 'end_time' => '09:50'])
            ->assistants()->attach($asisten);
        LabClass::factory()->for($course)->create(['semester_id' => $course->semester_id, 'name' => 'Kelas Lain']); // bukan miliknya

        // Senin 5 Okt 2026, 08:00 WIB — Kelas A sedang berjalan.
        $now = CarbonImmutable::parse('2026-10-05 08:00', 'Asia/Jakarta');
        $events = collect(AsistenDashboardData::for($asisten, $now)['week']['events']);
        $classes = $events->where('type', 'class')->values();

        $this->assertCount(1, $classes);
        $this->assertSame('Machine Learning', $classes[0]['title']);
        $this->assertSame('Kelas A', $classes[0]['subtitle']);
        $this->assertTrue($classes[0]['running']);
    }

    public function test_next_shift_rolls_over_to_next_week()
    {
        // Minggu malam: semua shift minggu ini sudah lewat → shift Rabu minggu depan.
        $now = CarbonImmutable::parse('2026-10-04 21:00', 'Asia/Jakarta');
        $shift = AsistenDashboardData::for(User::factory()->asisten()->make(), $now)['nextShift'];

        $this->assertSame('2026-10-07T13:00:00+07:00', $shift['startsAt']);
        $this->assertSame('Lab IR 1', $shift['room']);
    }
}
