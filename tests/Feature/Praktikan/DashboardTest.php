<?php

namespace Tests\Feature\Praktikan;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\Submission;
use App\Models\Task;
use App\Models\TaskTarget;
use App\Models\User;
use App\Support\Dashboard\PraktikanDashboardData;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create();
        $semester = Semester::factory()->active()->create();

        // Senin 07:20 Machine Learning, Selasa 07:20 Deep Learning.
        foreach ([[1, 'Machine Learning'], [2, 'Deep Learning']] as [$day, $name]) {
            $course = Course::factory()->for($semester)->create(['name' => $name]);
            $class = LabClass::factory()->create([
                'course_id' => $course->id, 'semester_id' => $semester->id,
                'name' => 'Kelas A', 'day_of_week' => $day, 'start_time' => '07:20', 'end_time' => '09:50',
            ]);
            Enrollment::factory()->for($class, 'labClass')->for($this->student)->create();
            $task = Task::factory()->create(['course_id' => $course->id, 'semester_id' => $semester->id, 'title' => "Post-Test {$name}"]);
            TaskTarget::factory()->for($task)->create(['class_id' => $class->id, 'open_at' => now()->subHour(), 'due_at' => now()->addDays($day)]);
        }
    }

    public function test_the_dashboard_receives_the_data_contract()
    {
        $this->actingAs($this->student)
            ->get(route('praktikan.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('praktikan/dashboard')
                ->has('dashboard', fn (Assert $dashboard) => $dashboard
                    ->hasAll(['isSample', 'hasClasses', 'nextClass', 'pendingTasks', 'openProgram', 'week', 'upcomingTasks', 'courseProgress', 'recentFeedback', 'announcements'])
                    ->has('upcomingTasks.0', fn (Assert $task) => $task
                        ->hasAll(['id', 'title', 'course', 'type', 'dueAt', 'status', 'href'])
                    )
                    ->has('nextClass', fn (Assert $class) => $class
                        ->hasAll(['course', 'className', 'module', 'room', 'assistant', 'seat', 'startsAt', 'endsAt'])
                    )
                    ->has('week.events', 2)
                )
            );
    }

    public function test_at_most_five_upcoming_tasks_sorted_by_deadline()
    {
        $tasks = PraktikanDashboardData::for($this->student)['upcomingTasks'];

        $this->assertLessThanOrEqual(5, count($tasks));
        $dueDates = array_column($tasks, 'dueAt');
        $sorted = $dueDates;
        sort($sorted);
        $this->assertSame($sorted, $dueDates);
    }

    public function test_pending_tasks_counts_only_unsubmitted_tasks()
    {
        $this->assertSame(2, PraktikanDashboardData::for($this->student)['pendingTasks']);

        Submission::factory()->create(['task_target_id' => TaskTarget::first()->id, 'user_id' => $this->student->id]);

        $data = PraktikanDashboardData::for($this->student);
        $this->assertSame(1, $data['pendingTasks']);
        $this->assertSame('submitted', $data['upcomingTasks'][0]['status']);
    }

    public function test_next_class_is_the_upcoming_session_of_an_enrolled_class()
    {
        // Senin 5 Okt 2026, 10:00 WIB — Machine Learning (07:20–09:50) sudah lewat → Deep Learning Selasa.
        $now = CarbonImmutable::parse('2026-10-05 10:00', 'Asia/Jakarta');
        $next = PraktikanDashboardData::for($this->student, $now)['nextClass'];

        $this->assertSame('Deep Learning', $next['course']);
        $this->assertSame('2026-10-06T07:20:00+07:00', $next['startsAt']);
    }

    public function test_the_running_class_is_flagged()
    {
        $now = CarbonImmutable::parse('2026-10-05 08:00', 'Asia/Jakarta');
        $events = collect(PraktikanDashboardData::for($this->student, $now)['week']['events']);

        $this->assertTrue($events->firstWhere('title', 'Machine Learning')['running']);
        $this->assertFalse($events->firstWhere('title', 'Deep Learning')['running']);
    }

    public function test_students_without_classes_get_the_getting_started_state()
    {
        $data = PraktikanDashboardData::for(User::factory()->create());

        $this->assertFalse($data['hasClasses']);
        $this->assertNull($data['nextClass']);
        $this->assertSame([], $data['week']['events']);
    }
}
