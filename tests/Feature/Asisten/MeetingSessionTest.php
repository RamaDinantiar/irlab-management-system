<?php

namespace Tests\Feature\Asisten;

use App\Events\MeetingStarted;
use App\Models\Attendance;
use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Semester;
use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\Pdf;
use Tests\TestCase;

/**
 * FR-AC-02/04/05 (detail kelas, pertemuan & modul, pengaturan), FR-AD-01 (sesi & presensi).
 */
class MeetingSessionTest extends TestCase
{
    use RefreshDatabase;

    private User $asisten;

    private LabClass $class;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('lab');

        $this->asisten = User::factory()->asisten()->create();
        $semester = Semester::factory()->active()->create(['start_date' => '2026-08-24', 'end_date' => '2026-12-18']);
        $course = Course::factory()->for($semester)->create();
        // Kelas hari Rabu.
        $this->class = LabClass::factory()->create(['course_id' => $course->id, 'semester_id' => $semester->id, 'day_of_week' => 3]);
        $this->class->assistants()->attach($this->asisten);
        $this->actingAs($this->asisten);
    }

    public function test_weekly_meetings_are_generated_from_the_first_class_day()
    {
        $this->post(route('asisten.classes.meetings.generate', $this->class), ['count' => 3])->assertRedirect();

        $dates = $this->class->meetings()->pluck('date')->map->toDateString()->all();
        // Semester mulai Senin 24 Agu → Rabu pertama 26 Agu.
        $this->assertSame(['2026-08-26', '2026-09-02', '2026-09-09'], $dates);

        // Generate ulang tidak menduplikasi.
        $this->post(route('asisten.classes.meetings.generate', $this->class), ['count' => 4]);
        $this->assertSame(4, $this->class->meetings()->count());
    }

    public function test_a_module_pdf_can_be_uploaded_with_a_release_date()
    {
        $this->post(route('asisten.classes.meetings.store', $this->class), [
            'number' => 1,
            'date' => '2026-08-26',
            'module_title' => 'Modul 01 · Intro',
            'module_release_at' => now()->addDay()->format('Y-m-d H:i'),
            'module_file' => Pdf::upload(),
        ])->assertSessionHasNoErrors();

        $meeting = Meeting::sole();
        $this->assertNotNull($meeting->module_file_id);
        $this->assertFalse($meeting->isModuleReleased());
    }

    public function test_modules_must_be_pdf()
    {
        $this->post(route('asisten.classes.meetings.store', $this->class), [
            'number' => 1, 'date' => '2026-08-26', 'module_file' => Pdf::zip(['a.txt' => 'x']),
        ])->assertSessionHasErrors('module_file');
    }

    public function test_other_assistants_cannot_manage_meetings()
    {
        $this->actingAs(User::factory()->asisten()->create())
            ->post(route('asisten.classes.meetings.generate', $this->class), ['count' => 2])
            ->assertForbidden();
    }

    public function test_starting_a_session_marks_it_and_dispatches_the_event_once()
    {
        Event::fake([MeetingStarted::class]);
        $meeting = Meeting::factory()->for($this->class, 'labClass')->create();

        $this->post(route('asisten.sessions.start', $meeting))->assertRedirect();
        $this->post(route('asisten.sessions.start', $meeting));

        $this->assertNotNull($meeting->fresh()->started_at);
        $this->assertSame($this->asisten->id, $meeting->fresh()->responsible_assistant_id);
        Event::assertDispatchedTimes(MeetingStarted::class, 1);
    }

    public function test_attendance_is_saved_only_for_members()
    {
        $meeting = Meeting::factory()->for($this->class, 'labClass')->create();
        $member = Enrollment::factory()->for($this->class, 'labClass')->create()->user;
        $outsider = User::factory()->create();

        $this->put(route('asisten.sessions.attendance', $meeting), [
            'attendance' => [$member->id => 'hadir', $outsider->id => 'hadir'],
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, Attendance::count());
        $this->assertSame('hadir', Attendance::sole()->status);

        $this->put(route('asisten.sessions.attendance', $meeting), ['attendance' => [$member->id => 'izin']]);
        $this->assertSame('izin', Attendance::sole()->status);
    }

    public function test_class_detail_tabs_render()
    {
        foreach (['asisten.class.show', 'asisten.class.meetings', 'asisten.class.attendance', 'asisten.class.settings'] as $route) {
            $this->get(route($route, $this->class))->assertOk();
        }

        $this->get(route('asisten.sessions.index'))->assertOk();
    }

    public function test_quota_cannot_go_below_current_members()
    {
        Enrollment::factory()->count(3)->for($this->class, 'labClass')->create();

        $this->put(route('asisten.classes.settings.update', $this->class), ['quota' => 2])->assertSessionHasErrors('quota');
        $this->put(route('asisten.classes.settings.update', $this->class), ['quota' => 25, 'seat_contract_open' => '1'])->assertSessionHasNoErrors();

        $this->assertTrue($this->class->fresh()->seat_contract_open);
    }

    public function test_praktikan_schedule_only_exposes_released_modules()
    {
        $student = Enrollment::factory()->for($this->class, 'labClass')->create()->user;
        $this->post(route('asisten.classes.meetings.store', $this->class), ['number' => 1, 'date' => '2026-08-26', 'module_file' => Pdf::upload()]);
        $this->post(route('asisten.classes.meetings.store', $this->class), ['number' => 2, 'date' => '2026-09-02', 'module_file' => Pdf::upload(), 'module_release_at' => now()->addWeek()->format('Y-m-d H:i')]);

        $this->actingAs($student)->get(route('praktikan.schedule'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('praktikan/schedule')
                ->whereNot('classes.0.meetings.0.module', null)
                ->where('classes.0.meetings.1.module', null)
                ->whereNot('classes.0.meetings.1.moduleReleaseAt', null)
            );
    }
}
