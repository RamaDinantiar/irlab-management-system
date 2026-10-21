<?php

namespace Tests\Feature\Asisten;

use App\Actions\Meeting\SyncMeetingSessions;
use App\Events\MeetingStarted;
use App\Models\Attendance;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
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

    public function test_a_meeting_is_saved_with_its_topic()
    {
        $this->post(route('asisten.classes.meetings.store', $this->class), [
            'number' => 1,
            'date' => '2026-08-26',
            'topic' => 'Pengantar & Setup Lingkungan',
        ])->assertSessionHasNoErrors();

        $this->assertSame('Pengantar & Setup Lingkungan', Meeting::sole()->topic);
    }

    public function test_other_assistants_cannot_manage_meetings()
    {
        $this->actingAs(User::factory()->asisten()->create())
            ->post(route('asisten.classes.meetings.generate', $this->class), ['count' => 2])
            ->assertForbidden();
    }

    public function test_attendance_of_a_meeting_downloads_as_a_tidy_csv()
    {
        $meeting = Meeting::factory()->for($this->class, 'labClass')->create(['number' => 3, 'date' => '2026-09-09', 'topic' => 'Klasifikasi']);
        $hadir = Enrollment::factory()->for($this->class, 'labClass')->create(['user_id' => User::factory()->create(['nim' => '202300001', 'name' => 'Ani'])])->user;
        Enrollment::factory()->for($this->class, 'labClass')->create(['user_id' => User::factory()->create(['nim' => '202300002', 'name' => '=HYPERLINK("x")'])]);
        $meeting->attendances()->create(['user_id' => $hadir->id, 'status' => 'hadir']);

        $response = $this->get(route('asisten.sessions.attendance.export', $meeting))->assertOk();
        $this->assertStringContainsString('pertemuan-3-2026-09-09.csv', $response->headers->get('Content-Disposition'));

        $csv = $response->streamedContent();
        $this->assertStringStartsWith("\u{FEFF}", $csv);
        $this->assertStringContainsString('Pertemuan;"3 · Klasifikasi"', $csv);
        $this->assertStringContainsString('Tanggal;"Rabu, 9 September 2026"', $csv);
        $this->assertStringContainsString("No;NIM;Nama;Status\n1;202300001;Ani;Hadir\n", $csv);
        // Nama berawalan "=" tidak dibaca sebagai rumus.
        $this->assertStringContainsString('2;202300002;"\'=HYPERLINK(""x"")";"Belum diisi"', $csv);
        $this->assertStringContainsString("Hadir;1\n", $csv);
        $this->assertStringContainsString("Total;2\n", $csv);

        $this->actingAs(User::factory()->asisten()->create())
            ->get(route('asisten.sessions.attendance.export', $meeting))->assertForbidden();
    }

    public function test_sessions_start_and_end_automatically_with_the_class_hours()
    {
        Event::fake([MeetingStarted::class]);
        // Kelas 07.20–09.50.
        $meeting = Meeting::factory()->for($this->class, 'labClass')->create(['date' => '2026-09-02']);
        $sync = app(SyncMeetingSessions::class);

        $this->travelTo('2026-09-02 07:19');
        $sync();
        $this->assertNull($meeting->fresh()->started_at);
        $this->assertFalse($meeting->fresh()->isRunning());

        $this->travelTo('2026-09-02 07:20');
        $sync();
        $sync();
        $this->assertSame('2026-09-02 07:20', $meeting->fresh()->started_at->format('Y-m-d H:i'));
        $this->assertSame($this->asisten->id, $meeting->fresh()->responsible_assistant_id);
        $this->assertTrue($meeting->fresh()->isRunning());
        $this->assertSame([$meeting->id], Meeting::running()->pluck('id')->all());
        Event::assertDispatchedTimes(MeetingStarted::class, 1);

        $this->travelTo('2026-09-02 09:50');
        $sync();
        $this->assertSame('2026-09-02 09:50', $meeting->fresh()->ended_at->format('Y-m-d H:i'));
        $this->assertFalse($meeting->fresh()->isRunning());
        $this->assertSame([], Meeting::running()->pluck('id')->all());
    }

    public function test_missed_sessions_are_closed_without_opening_pretests()
    {
        Event::fake([MeetingStarted::class]);
        $meeting = Meeting::factory()->for($this->class, 'labClass')->create(['date' => '2026-09-02']);

        // Scheduler mati seharian → besoknya hanya dicatat, Pre-Test tidak dibuka terlambat.
        $this->travelTo('2026-09-03 10:00');
        app(SyncMeetingSessions::class)();

        $this->assertNotNull($meeting->fresh()->started_at);
        $this->assertNotNull($meeting->fresh()->ended_at);
        Event::assertNotDispatched(MeetingStarted::class);
    }

    public function test_sessions_can_be_ended_early_and_attendance_opens_at_the_start_time()
    {
        $meeting = Meeting::factory()->for($this->class, 'labClass')->create(['date' => '2026-09-02']);
        $member = Enrollment::factory()->for($this->class, 'labClass')->create()->user;

        $this->travelTo('2026-09-02 07:00');
        $this->put(route('asisten.sessions.attendance', $meeting), ['attendance' => [$member->id => 'hadir']])->assertStatus(422);
        $this->post(route('asisten.sessions.end', $meeting))->assertStatus(422);

        $this->travelTo('2026-09-02 08:00');
        $this->put(route('asisten.sessions.attendance', $meeting), ['attendance' => [$member->id => 'hadir']])->assertSessionHasNoErrors();
        $this->post(route('asisten.sessions.end', $meeting))->assertSessionHasNoErrors();
        $this->assertFalse($meeting->fresh()->isRunning());

        // Presensi tetap bisa dikoreksi setelah sesi selesai.
        $this->travelTo('2026-09-03 10:00');
        $this->put(route('asisten.sessions.attendance', $meeting), ['attendance' => [$member->id => 'izin']])->assertSessionHasNoErrors();
        $this->assertSame('izin', Attendance::sole()->status);
    }

    public function test_attendance_is_saved_only_for_members()
    {
        $meeting = Meeting::factory()->for($this->class, 'labClass')->create(['date' => today()->subDay()]);
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

    public function test_praktikan_schedule_lists_meeting_topics()
    {
        $student = Enrollment::factory()->for($this->class, 'labClass')->create()->user;
        $this->post(route('asisten.classes.meetings.store', $this->class), ['number' => 1, 'date' => '2026-08-26', 'topic' => 'Klasifikasi']);

        $this->actingAs($student)->get(route('praktikan.schedule'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('praktikan/schedule')
                ->where('classes.0.meetings.0.topic', 'Klasifikasi')
                ->missing('classes.0.meetings.0.module')
            );
    }

    public function test_praktikan_sees_every_active_class_in_the_lab()
    {
        $student = Enrollment::factory()->for($this->class, 'labClass')->create()->user;
        $other = LabClass::factory()->create(['course_id' => $this->class->course_id, 'semester_id' => $this->class->semester_id, 'day_of_week' => 1]);

        $this->actingAs($student)->get(route('praktikan.schedule'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('allClasses', 2)
                ->where('allClasses.0.id', $other->id)
                ->where('allClasses.0.mine', false)
                ->where('allClasses.1.id', $this->class->id)
                ->where('allClasses.1.mine', true)
            );
    }
}
