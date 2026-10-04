<?php

namespace Tests\Feature\Asisten;

use App\Enums\ApprovalStatus;
use App\Models\Course;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * FR-AS-02: Asisten mengajukan Mata Kuliah (perlu persetujuan Admin).
 */
class CourseProposalTest extends TestCase
{
    use RefreshDatabase;

    private User $asisten;

    private Semester $semester;

    protected function setUp(): void
    {
        parent::setUp();

        $this->asisten = User::factory()->asisten()->create();
        $this->semester = Semester::factory()->active()->create();
        $this->actingAs($this->asisten);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'code' => 'IF-3104',
            'name' => 'Natural Language Processing',
            'credits' => 3,
            'weight_pretest' => 20,
            'weight_posttest' => 30,
            'weight_report' => 50,
            ...$overrides,
        ];
    }

    public function test_a_proposal_is_pending_and_the_proposer_becomes_an_assistant()
    {
        $this->post(route('asisten.course-proposals.store'), $this->payload())
            ->assertRedirect(route('asisten.class.index'));

        $course = Course::sole();
        $this->assertSame(ApprovalStatus::Pending, $course->approval_status);
        $this->assertSame($this->semester->id, $course->semester_id);
        $this->assertSame($this->asisten->id, $course->proposed_by);
        $this->assertTrue($course->assistants->contains($this->asisten));
    }

    public function test_proposals_require_an_active_semester()
    {
        $this->semester->forceFill(['status' => 'archived'])->save();

        $this->post(route('asisten.course-proposals.store'), $this->payload())->assertForbidden();
    }

    public function test_a_rejected_proposal_can_be_revised_and_resubmitted()
    {
        $course = Course::factory()->for($this->semester)->pending($this->asisten)->create();
        $course->forceFill(['approval_status' => ApprovalStatus::Rejected, 'rejection_reason' => 'Bobot keliru'])->save();

        $this->put(route('asisten.course-proposals.update', $course), $this->payload(['weight_report' => 40, 'weight_posttest' => 40]))
            ->assertRedirect();

        $course->refresh();
        $this->assertSame(ApprovalStatus::Pending, $course->approval_status);
        $this->assertNull($course->rejection_reason);
        $this->assertSame(40, $course->weight_report);
    }

    public function test_asisten_cannot_edit_someone_elses_or_approved_courses()
    {
        $others = Course::factory()->for($this->semester)->pending()->create();
        $approved = Course::factory()->for($this->semester)->create(['proposed_by' => $this->asisten->id]);

        $this->put(route('asisten.course-proposals.update', $others), $this->payload())->assertForbidden();
        $this->put(route('asisten.course-proposals.update', $approved), $this->payload())->assertForbidden();
    }

    public function test_the_class_page_lists_assigned_courses_and_own_proposals()
    {
        $assigned = Course::factory()->for($this->semester)->create();
        $assigned->assistants()->attach($this->asisten);
        Course::factory()->for($this->semester)->create(); // tidak diampu
        Course::factory()->for($this->semester)->pending($this->asisten)->create();

        $this->get(route('asisten.class.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('asisten/class/index')
                ->has('courses', 1)
                ->where('courses.0.id', $assigned->id)
                ->has('proposals', 1)
            );
    }
}
