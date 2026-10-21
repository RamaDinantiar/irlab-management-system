<?php

namespace Tests\Feature\Admin;

use App\Enums\ApprovalStatus;
use App\Models\Course;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * US-D02 (Mata Kuliah), FR-ADM-03 (persetujuan), US-D01-3 (salin struktur).
 */
class CourseTest extends TestCase
{
    use RefreshDatabase;

    private Semester $semester;

    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAs(User::factory()->admin()->create());
        $this->semester = Semester::factory()->active()->create();
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'semester_id' => $this->semester->id,
            'code' => 'IF-3101',
            'name' => 'Machine Learning',
            'credits' => 3,
            'weight_pretest' => 20,
            'weight_posttest' => 30,
            'weight_report' => 50,
            'assistant_ids' => [],
            ...$overrides,
        ];
    }

    public function test_admin_can_create_a_course_with_assistants()
    {
        $assistant = User::factory()->asisten()->create();

        $this->post(route('admin.courses.store'), $this->payload(['assistant_ids' => [$assistant->id]]))
            ->assertRedirect(route('admin.courses.index', ['semester' => $this->semester->id]));

        $course = Course::sole();
        $this->assertSame(ApprovalStatus::Approved, $course->approval_status);
        $this->assertTrue($course->assistants->contains($assistant));
        $this->assertDatabaseHas('audit_logs', ['action' => 'course.created']);
    }

    public function test_weights_must_total_100()
    {
        $this->post(route('admin.courses.store'), $this->payload(['weight_report' => 40]))
            ->assertSessionHasErrors(['weights' => 'Total bobot harus 100% (saat ini 90%).']);
    }

    public function test_admin_picks_the_schedule_color()
    {
        $this->post(route('admin.courses.store'), $this->payload(['color' => 'purple']))->assertSessionHasNoErrors();
        $course = Course::sole();
        $this->assertSame('purple', $course->color);

        $this->put(route('admin.courses.update', $course), $this->payload(['color' => 'lime']))->assertSessionHasNoErrors();
        $this->assertSame('lime', $course->fresh()->color);

        $this->put(route('admin.courses.update', $course), $this->payload(['color' => 'teal']))->assertSessionHasErrors('color');
    }

    public function test_new_courses_get_the_figma_color_or_an_unused_one()
    {
        $ml = Course::factory()->for($this->semester)->create(['code' => 'IF-3101', 'name' => 'Machine Learning']);
        $ir = Course::factory()->for($this->semester)->create(['code' => 'IF-3103', 'name' => 'Information Retrieval']);
        $nlp = Course::factory()->for($this->semester)->create(['code' => 'IF-3104', 'name' => 'Natural Language Processing']);
        $irNext = Course::factory()->for(Semester::factory())->create(['code' => 'IF-3103', 'name' => 'Information Retrieval']);

        $this->assertSame('red', $ml->color);
        $this->assertSame('pink', $ir->color);
        $this->assertSame('cyan', $nlp->color);
        $this->assertSame('pink', $irNext->color, 'kode yang sama tetap sewarna antar-semester');
    }

    public function test_code_is_unique_per_semester_only()
    {
        Course::factory()->for($this->semester)->create(['code' => 'IF-3101']);
        Course::factory()->for(Semester::factory()->archived())->create(['code' => 'IF-3102']);

        $this->post(route('admin.courses.store'), $this->payload())->assertSessionHasErrors('code');
        $this->post(route('admin.courses.store'), $this->payload(['code' => 'IF-3102']))->assertSessionHasNoErrors();
    }

    public function test_only_asisten_accounts_can_be_assigned()
    {
        $praktikan = User::factory()->create();

        $this->post(route('admin.courses.store'), $this->payload(['assistant_ids' => [$praktikan->id]]))
            ->assertSessionHasErrors('assistant_ids.0');
    }

    public function test_courses_in_archived_semesters_are_read_only()
    {
        $course = Course::factory()->for(Semester::factory()->archived())->create();

        $this->put(route('admin.courses.update', $course), $this->payload(['name' => 'Diubah']))->assertForbidden();
        $this->delete(route('admin.courses.destroy', $course))->assertForbidden();
        $this->post(route('admin.courses.store'), $this->payload(['semester_id' => $course->semester_id, 'code' => 'IF-9999']))->assertForbidden();
    }

    public function test_the_index_separates_pending_proposals_and_defaults_to_the_active_semester()
    {
        Course::factory()->for($this->semester)->create();
        Course::factory()->for($this->semester)->pending()->create();
        Course::factory()->for(Semester::factory()->archived())->create();

        $this->get(route('admin.courses.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/courses/index')
                ->where('semester.id', $this->semester->id)
                ->has('courses', 1)
                ->has('pending', 1)
            );
    }

    public function test_admin_can_approve_a_proposal()
    {
        $course = Course::factory()->for($this->semester)->pending()->create();

        $this->post(route('admin.courses.approve', $course))->assertRedirect();

        $this->assertSame(ApprovalStatus::Approved, $course->fresh()->approval_status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'course.approved', 'auditable_id' => $course->id]);
    }

    public function test_rejecting_requires_a_reason()
    {
        $course = Course::factory()->for($this->semester)->pending()->create();

        $this->post(route('admin.courses.reject', $course), ['reason' => ''])->assertSessionHasErrors('reason');

        $this->post(route('admin.courses.reject', $course), ['reason' => 'Kode bentrok dengan IF-3104.'])->assertRedirect();
        $this->assertSame(ApprovalStatus::Rejected, $course->fresh()->approval_status);
        $this->assertSame('Kode bentrok dengan IF-3104.', $course->fresh()->rejection_reason);
    }

    public function test_a_proposal_cannot_be_reviewed_twice()
    {
        $course = Course::factory()->for($this->semester)->create();

        $this->post(route('admin.courses.approve', $course))->assertSessionHasErrors('course');
    }

    public function test_structure_can_be_copied_from_another_semester()
    {
        $source = Semester::factory()->archived()->create();
        $assistant = User::factory()->asisten()->create();
        Course::factory()->for($source)->create(['code' => 'IF-3101', 'weight_report' => 60, 'weight_posttest' => 20])->assistants()->attach($assistant);
        Course::factory()->for($source)->create(['code' => 'IF-3102']);
        Course::factory()->for($source)->pending()->create(['code' => 'IF-3199']);
        Course::factory()->for($this->semester)->create(['code' => 'IF-3102']);

        $this->post(route('admin.semesters.copy-structure', $this->semester), ['source_id' => $source->id])
            ->assertRedirect(route('admin.semesters.index'));

        $copied = Course::forSemester($this->semester)->where('code', 'IF-3101')->sole();
        $this->assertSame(60, $copied->weight_report);
        $this->assertCount(0, $copied->assistants, 'Asisten pengampu tidak ikut disalin.');
        $this->assertSame(2, Course::forSemester($this->semester)->count(), 'Kode yang sudah ada dan pengajuan pending dilewati.');
        $this->assertDatabaseHas('audit_logs', ['action' => 'semester.structure_copied']);
    }

    public function test_structure_cannot_be_copied_into_an_archived_semester()
    {
        $archived = Semester::factory()->archived()->create();

        $this->post(route('admin.semesters.copy-structure', $archived), ['source_id' => $this->semester->id])
            ->assertSessionHasErrors('source_id');
    }

    public function test_the_admin_dashboard_lists_real_course_proposals()
    {
        $proposer = User::factory()->asisten()->create(['name' => 'Michael Christia']);
        Course::factory()->for($this->semester)->pending($proposer)->create(['name' => 'Natural Language Processing']);

        $this->get(route('admin.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('dashboard.approvals', 1)
                ->where('dashboard.approvals.0.name', 'Natural Language Processing')
                ->where('dashboard.approvals.0.requestedBy', 'Michael Christia')
            );
    }
}
