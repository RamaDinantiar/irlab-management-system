<?php

namespace Tests\Feature\Asisten;

use App\Enums\ApprovalStatus;
use App\Models\Course;
use App\Models\LabClass;
use App\Models\Room;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * US-A01: Asisten membuat kelas (perlu persetujuan), token & Lock Class.
 */
class ClassProposalTest extends TestCase
{
    use RefreshDatabase;

    private User $asisten;

    private Course $course;

    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();

        $this->asisten = User::factory()->asisten()->create();
        $this->course = Course::factory()->for(Semester::factory()->active())->create();
        $this->course->assistants()->attach($this->asisten);
        $this->room = Room::factory()->create();
        $this->actingAs($this->asisten);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'course_id' => $this->course->id,
            'name' => 'Kelas D',
            'day_of_week' => 3,
            'start_time' => '13:00',
            'end_time' => '14:40',
            'room_id' => $this->room->id,
            'quota' => 25,
            ...$overrides,
        ];
    }

    public function test_a_proposed_class_is_pending_without_a_token()
    {
        $this->post(route('asisten.class-proposals.store'), $this->payload())->assertRedirect(route('asisten.class.index'));

        $class = LabClass::sole();
        $this->assertSame(ApprovalStatus::Pending, $class->approval_status);
        $this->assertNull($class->join_token);
        $this->assertTrue($class->assistants->contains($this->asisten));
    }

    public function test_asisten_can_only_propose_for_courses_they_teach()
    {
        $other = Course::factory()->for($this->course->semester)->create();

        $this->post(route('asisten.class-proposals.store'), $this->payload(['course_id' => $other->id]))
            ->assertSessionHasErrors(['course_id' => 'Pilih mata kuliah yang sudah disetujui dan Anda ampu.']);
    }

    public function test_changing_the_schedule_of_an_active_class_needs_no_reapproval()
    {
        $class = LabClass::factory()->create(['course_id' => $this->course->id, 'semester_id' => $this->course->semester_id, 'room_id' => $this->room->id]);
        $class->assistants()->attach($this->asisten);

        $this->put(route('asisten.class-proposals.update', $class), $this->payload(['name' => $class->name, 'day_of_week' => 4]))
            ->assertRedirect();

        $this->assertSame(4, $class->fresh()->day_of_week);
        $this->assertSame(ApprovalStatus::Approved, $class->fresh()->approval_status);
    }

    public function test_assistants_manage_token_and_lock_only_for_their_classes()
    {
        $mine = LabClass::factory()->create(['course_id' => $this->course->id, 'semester_id' => $this->course->semester_id]);
        $mine->assistants()->attach($this->asisten);
        $others = LabClass::factory()->create(['course_id' => $this->course->id, 'semester_id' => $this->course->semester_id]);

        $old = $mine->join_token;
        $this->post(route('asisten.classes.token', $mine))->assertRedirect();
        $this->assertNotSame($old, $mine->fresh()->join_token);

        $this->post(route('asisten.classes.lock', $mine), ['locked' => '1']);
        $this->assertTrue($mine->fresh()->is_locked);

        $this->post(route('asisten.classes.token', $others))->assertForbidden();
        $this->post(route('asisten.classes.lock', $others), ['locked' => '1'])->assertForbidden();
    }

    public function test_pending_classes_have_no_token_to_regenerate()
    {
        $class = LabClass::factory()->pending($this->asisten)->create(['course_id' => $this->course->id, 'semester_id' => $this->course->semester_id]);
        $class->assistants()->attach($this->asisten);

        $this->post(route('asisten.classes.token', $class))->assertSessionHasErrors('class');
    }
}
