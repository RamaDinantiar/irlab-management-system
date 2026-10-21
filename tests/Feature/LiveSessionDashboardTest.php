<?php

namespace Tests\Feature;

use App\Enums\TaskType;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Semester;
use App\Models\Submission;
use App\Models\Task;
use App\Models\TaskTarget;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Panel "Sesi Berlangsung" (Asisten) & "Kelas Sedang Berlangsung" (Praktikan):
 * muncul otomatis selama jam kelas.
 */
class LiveSessionDashboardTest extends TestCase
{
    use RefreshDatabase;

    private User $asisten;

    private User $student;

    private LabClass $class;

    private Meeting $meeting;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo('2026-09-02 08:00');

        $semester = Semester::factory()->active()->create(['start_date' => '2026-08-24', 'end_date' => '2026-12-18']);
        $course = Course::factory()->for($semester)->create(['name' => 'Machine Learning']);
        $this->class = LabClass::factory()->create(['course_id' => $course->id, 'semester_id' => $semester->id, 'name' => 'Kelas A', 'day_of_week' => 3]);
        $this->asisten = User::factory()->asisten()->create();
        $this->class->assistants()->attach($this->asisten);
        $this->student = Enrollment::factory()->for($this->class, 'labClass')->create()->user;
        $this->meeting = Meeting::factory()->for($this->class, 'labClass')->create(['number' => 2, 'date' => '2026-09-02', 'topic' => 'Regresi']);
    }

    private function target(TaskType $type, string $title, array $attributes = []): TaskTarget
    {
        $task = Task::factory()->create(['course_id' => $this->class->course_id, 'type' => $type, 'title' => $title]);

        return TaskTarget::factory()->for($task)->create(['class_id' => $this->class->id, 'open_at' => now()->subMinutes(10), 'due_at' => now()->addMinutes(20), ...$attributes]);
    }

    public function test_the_assistant_dashboard_shows_the_running_session_with_open_tasks()
    {
        $pretest = $this->target(TaskType::Pretest, 'Pre-Test Pertemuan 02');
        $this->target(TaskType::Report, 'Laporan Pertemuan 02', ['due_at' => now()->addDays(3)]);
        $this->target(TaskType::Posttest, 'Post-Test Pertemuan 02', ['open_at' => now()->addHour()]);
        Submission::factory()->create(['task_target_id' => $pretest->id, 'user_id' => $this->student->id]);

        $this->actingAs($this->asisten)->get(route('asisten.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('liveSessions', 1)
                ->where('liveSessions.0.meetingId', $this->meeting->id)
                ->where('liveSessions.0.topic', 'Regresi')
                ->where('liveSessions.0.members', 1)
                ->where('liveSessions.0.endsAt', '2026-09-02T09:50:00+07:00')
                ->has('liveSessions.0.tasks', 2)
                ->where('liveSessions.0.tasks.0.title', 'Pre-Test Pertemuan 02')
                ->where('liveSessions.0.tasks.0.submitted', 1));

        $this->assertNotNull($this->meeting->fresh()->started_at);
    }

    public function test_students_see_only_open_pre_and_post_tests_of_the_running_class()
    {
        $pretest = $this->target(TaskType::Pretest, 'Pre-Test Pertemuan 02');
        $this->target(TaskType::Posttest, 'Post-Test Pertemuan 02');
        $this->target(TaskType::Report, 'Laporan Pertemuan 02');
        $this->target(TaskType::Posttest, 'Post-Test dihentikan', ['closed_at' => now()->subMinute()]);
        Submission::factory()->create(['task_target_id' => $pretest->id, 'user_id' => $this->student->id]);

        $this->actingAs($this->student)->get(route('praktikan.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('liveSessions', 1)
                ->has('liveSessions.0.tests', 2)
                ->where('liveSessions.0.tests.0.title', 'Pre-Test Pertemuan 02')
                ->where('liveSessions.0.tests.0.submitted', true)
                ->where('liveSessions.0.tests.1.submitted', false)
                ->where('liveSessions.0.tests.1.href', fn ($href) => str_starts_with($href, '/praktikan/tasks/')));
    }

    public function test_late_submittable_tests_stay_on_the_panel_after_the_deadline()
    {
        $late = $this->target(TaskType::Pretest, 'Pre-Test boleh terlambat', ['due_at' => now()->subMinutes(5)]);
        $late->task->update(['allow_late' => true]);
        $this->target(TaskType::Posttest, 'Post-Test sudah lewat', ['due_at' => now()->subMinutes(5)]);

        $this->actingAs($this->student)->get(route('praktikan.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('liveSessions.0.tests', 1)
                ->where('liveSessions.0.tests.0.title', 'Pre-Test boleh terlambat'));
    }

    public function test_polling_reloads_only_the_live_sessions()
    {
        $this->actingAs($this->student)->get(route('praktikan.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->reloadOnly('liveSessions', fn (Assert $reload) => $reload
                    ->has('liveSessions', 1)
                    ->missing('dashboard')));
    }

    public function test_no_panel_outside_class_hours_or_after_ending_early()
    {
        $this->travelTo('2026-09-02 10:00');
        $this->actingAs($this->student)->get(route('praktikan.dashboard'))
            ->assertInertia(fn (Assert $page) => $page->has('liveSessions', 0));

        $this->travelTo('2026-09-02 08:30');
        $this->meeting->update(['ended_at' => now()]);
        $this->actingAs($this->asisten)->get(route('asisten.dashboard'))
            ->assertInertia(fn (Assert $page) => $page->has('liveSessions', 0));
    }
}
