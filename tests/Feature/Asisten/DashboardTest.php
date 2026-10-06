<?php

namespace Tests\Feature\Asisten;

use App\Enums\Position;
use App\Enums\TaskType;
use App\Models\Course;
use App\Models\Grade;
use App\Models\LabClass;
use App\Models\Room;
use App\Models\Semester;
use App\Models\Shift;
use App\Models\Submission;
use App\Models\Task;
use App\Models\TaskTarget;
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
        $asisten = User::factory()->asisten()->create();
        $course = Course::factory()->for(Semester::factory()->active())->create();
        LabClass::factory()->for($course)->create(['semester_id' => $course->semester_id])->assistants()->attach($asisten);

        $this->actingAs($asisten)
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

    public function test_pending_grading_counts_only_ungraded_pre_and_post_tests()
    {
        $asisten = User::factory()->asisten()->create();
        $course = Course::factory()->for(Semester::factory()->active())->create();
        $class = LabClass::factory()->for($course)->create(['semester_id' => $course->semester_id]);
        $class->assistants()->attach($asisten);

        $submit = function (TaskType $type, int $count) use ($course, $class) {
            $target = TaskTarget::factory()->for(Task::factory()->create(['course_id' => $course->id, 'type' => $type]))
                ->create(['class_id' => $class->id, 'open_at' => now()->subDay()]);

            return Submission::factory()->count($count)->for($target, 'target')->create();
        };

        $posttests = $submit(TaskType::Posttest, 3);
        $submit(TaskType::Pretest, 2);
        $submit(TaskType::Report, 4); // laporan tidak dihitung (Figma)
        Grade::factory()->for($posttests->first())->create();

        $data = AsistenDashboardData::for($asisten);

        $this->assertSame(4, $data['pendingGrading']);
        $this->assertSame(4, $data['gradingQueue'][0]['submitted'] - $data['gradingQueue'][0]['graded']);
        $this->assertCount(3, $data['gradingQueue']);
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
        // Minggu malam: shift minggu ini sudah lewat → shift Rabu minggu depan.
        $asisten = User::factory()->asisten()->create();
        $room = Room::factory()->create(['name' => 'Lab IR']);
        $semester = Semester::factory()->active()->create();
        foreach (['2026-10-01', '2026-10-07'] as $date) {
            Shift::create(['semester_id' => $semester->id, 'user_id' => $asisten->id, 'room_id' => $room->id, 'date' => $date, 'start_time' => '13:00', 'end_time' => '16:00', 'title' => 'Jaga Lab']);
        }

        $now = CarbonImmutable::parse('2026-10-04 21:00', 'Asia/Jakarta');
        $shift = AsistenDashboardData::for($asisten, $now)['nextShift'];

        $this->assertSame('2026-10-07T13:00:00+07:00', $shift['startsAt']);
        $this->assertSame('Lab IR', $shift['room']);
    }
}
