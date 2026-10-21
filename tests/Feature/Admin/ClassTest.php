<?php

namespace Tests\Feature\Admin;

use App\Enums\ApprovalStatus;
use App\Models\Course;
use App\Models\LabClass;
use App\Models\Room;
use App\Models\Semester;
use App\Models\User;
use App\Support\JoinToken;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * FR-ADM-04, US-D02-2/3, US-A01 (token, lock, persetujuan), FR-ENR-01.
 */
class ClassTest extends TestCase
{
    use RefreshDatabase;

    private Semester $semester;

    private Course $course;

    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::factory()->admin()->create());
        $this->semester = Semester::factory()->active()->create();
        $this->course = Course::factory()->for($this->semester)->create(['name' => 'Machine Learning']);
        $this->room = Room::factory()->create(['name' => 'Lab IR']);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'semester_id' => $this->semester->id,
            'course_id' => $this->course->id,
            'name' => 'Kelas A',
            'lecturer' => 'Dine Tiara Kusuma, ST., M.Kom',
            'day_of_week' => 1,
            'start_time' => '07:20',
            'end_time' => '09:50',
            'room_id' => $this->room->id,
            'quota' => 30,
            'assistant_ids' => [],
            ...$overrides,
        ];
    }

    private function classAt(string $start, string $end, array $overrides = []): LabClass
    {
        return LabClass::factory()->create([
            'course_id' => $this->course->id,
            'semester_id' => $this->semester->id,
            'room_id' => $this->room->id,
            'day_of_week' => 1,
            'start_time' => $start,
            'end_time' => $end,
            ...$overrides,
        ]);
    }

    public function test_admin_created_classes_get_a_unique_readable_token()
    {
        $this->post(route('admin.classes.store'), $this->payload())->assertRedirect();

        $class = LabClass::sole();
        $this->assertSame(ApprovalStatus::Approved, $class->approval_status);
        $this->assertMatchesRegularExpression('/^['.JoinToken::ALPHABET.']{6}$/', $class->join_token);
        $this->assertDoesNotMatchRegularExpression('/[O0I1]/', $class->join_token);
    }

    public function test_the_lecturer_name_is_required()
    {
        foreach (['', '   '] as $lecturer) {
            $this->post(route('admin.classes.store'), $this->payload(['lecturer' => $lecturer]))
                ->assertSessionHasErrors('lecturer');
        }

        $this->assertSame(0, LabClass::count());
    }

    public function test_room_clashes_are_rejected()
    {
        $this->classAt('07:20', '09:50', ['name' => 'Kelas B']);

        $this->post(route('admin.classes.store'), $this->payload(['start_time' => '09:00', 'end_time' => '10:30']))
            ->assertSessionHasErrors('room_id');

        // Berdempetan (selesai 09:50, mulai 09:50) tidak dianggap bentrok.
        $this->post(route('admin.classes.store'), $this->payload(['start_time' => '09:50', 'end_time' => '11:00']))
            ->assertSessionHasNoErrors();
    }

    public function test_assistant_clashes_warn_and_can_be_confirmed()
    {
        $assistant = User::factory()->asisten()->create();
        $this->classAt('07:20', '09:50', ['name' => 'Kelas B'])->assistants()->attach($assistant);
        $otherRoom = Room::factory()->create();

        $payload = $this->payload(['room_id' => $otherRoom->id, 'assistant_ids' => [$assistant->id]]);

        $this->post(route('admin.classes.store'), $payload)->assertSessionHasErrors('assistant_conflict');
        $this->assertSame(1, LabClass::count());

        $this->post(route('admin.classes.store'), [...$payload, 'confirm_conflicts' => '1'])->assertSessionHasNoErrors();
        $this->assertSame(2, LabClass::count());
    }

    public function test_end_time_must_be_after_start_time()
    {
        $this->post(route('admin.classes.store'), $this->payload(['start_time' => '10:00', 'end_time' => '09:00']))
            ->assertSessionHasErrors(['end_time' => 'Jam selesai harus setelah jam mulai.']);
    }

    public function test_approving_a_proposal_generates_a_token()
    {
        $class = LabClass::factory()->pending()->create(['course_id' => $this->course->id, 'semester_id' => $this->semester->id]);
        $this->assertNull($class->join_token);

        $this->post(route('admin.classes.approve', $class))->assertRedirect();

        $this->assertSame(ApprovalStatus::Approved, $class->fresh()->approval_status);
        $this->assertNotNull($class->fresh()->join_token);
    }

    public function test_rejecting_a_class_requires_a_reason()
    {
        $class = LabClass::factory()->pending()->create(['course_id' => $this->course->id, 'semester_id' => $this->semester->id]);

        $this->post(route('admin.classes.reject', $class), ['reason' => ''])->assertSessionHasErrors('reason');
        $this->post(route('admin.classes.reject', $class), ['reason' => 'Ruang dipakai UTS.'])->assertRedirect();

        $this->assertSame(ApprovalStatus::Rejected, $class->fresh()->approval_status);
        $this->assertNull($class->fresh()->join_token);
    }

    public function test_regenerating_the_token_invalidates_the_old_one()
    {
        $class = $this->classAt('07:20', '09:50');
        $old = $class->join_token;

        $this->post(route('admin.classes.token', $class))->assertRedirect();

        $this->assertNotSame($old, $class->fresh()->join_token);
        $this->assertDatabaseHas('audit_logs', ['action' => 'class.token_regenerated']);
    }

    public function test_classes_can_be_locked_and_unlocked()
    {
        $class = $this->classAt('07:20', '09:50');

        $this->post(route('admin.classes.lock', $class), ['locked' => '1']);
        $this->assertTrue($class->fresh()->is_locked);

        $this->post(route('admin.classes.lock', $class), ['locked' => '0']);
        $this->assertFalse($class->fresh()->is_locked);
    }

    public function test_courses_with_classes_cannot_be_deleted()
    {
        $this->classAt('07:20', '09:50');

        $this->delete(route('admin.courses.destroy', $this->course))->assertSessionHasErrors('course');
        $this->assertModelExists($this->course);
    }

    public function test_rooms_in_use_cannot_be_deleted()
    {
        $this->classAt('07:20', '09:50');

        $this->delete(route('admin.rooms.destroy', $this->room))->assertSessionHasErrors('room');
        $this->assertModelExists($this->room);
    }

    public function test_the_admin_dashboard_lists_pending_classes()
    {
        $proposer = User::factory()->asisten()->create(['name' => 'Dimas Asisten']);
        LabClass::factory()->pending($proposer)->create(['course_id' => $this->course->id, 'semester_id' => $this->semester->id, 'name' => 'Kelas C']);

        $this->get(route('admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('dashboard.approvals.0.type', 'class')
                ->where('dashboard.approvals.0.name', 'Machine Learning · Kelas C')
            );
    }
}
