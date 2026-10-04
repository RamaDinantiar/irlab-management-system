<?php

namespace Tests\Feature\Asisten;

use App\Enums\TaskType;
use App\Events\GradesPublished;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\Submission;
use App\Models\Task;
use App\Models\TaskTarget;
use App\Models\User;
use App\Support\Grading\FinalScore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * FR-AG-01…06, US-A02, FR-PG — Penilaian.
 */
class GradingTest extends TestCase
{
    use RefreshDatabase;

    private User $asisten;

    private LabClass $class;

    private TaskTarget $target;

    /** @var list<Submission> */
    private array $submissions;

    protected function setUp(): void
    {
        parent::setUp();

        $this->asisten = User::factory()->asisten()->create();
        $course = Course::factory()->for(Semester::factory()->active())->create();
        $course->assistants()->attach($this->asisten);
        $this->class = LabClass::factory()->create(['course_id' => $course->id, 'semester_id' => $course->semester_id]);
        $this->class->assistants()->attach($this->asisten);
        $task = Task::factory()->create(['course_id' => $course->id, 'max_score' => 100]);
        $this->target = TaskTarget::factory()->for($task)->create(['class_id' => $this->class->id, 'open_at' => now()->subDay(), 'due_at' => now()->addDay()]);

        $this->submissions = collect(range(1, 3))->map(function () {
            $student = Enrollment::factory()->for($this->class, 'labClass')->create()->user;

            return Submission::factory()->for($this->target, 'target')->for($student)->create();
        })->all();

        $this->actingAs($this->asisten);
    }

    private function batch(array $grades)
    {
        return $this->patch(route('asisten.grades.batch'), ['target_id' => $this->target->id, 'grades' => $grades]);
    }

    private function row(Submission $submission, $score, ?int $version = null, ?string $feedback = null): array
    {
        return ['submission_id' => $submission->id, 'score' => $score, 'feedback' => $feedback, 'version' => $version];
    }

    public function test_the_grade_table_lists_class_members_with_their_submissions()
    {
        $this->get(route('asisten.grades.index', ['type' => 'post-test']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('asisten/grades/index')
                ->where('selected.targetId', $this->target->id)
                ->has('rows', 3));
    }

    public function test_a_batch_is_saved_as_draft_with_versions()
    {
        $this->batch([
            $this->row($this->submissions[0], 85, feedback: "Bagus.\n```python\nprint(1)\n```"),
            $this->row($this->submissions[1], '72.5'),
        ])->assertSessionHasNoErrors();

        $this->assertSame(2, Grade::where('status', 'draft')->count());
        $grade = $this->submissions[1]->grade()->first();
        $this->assertSame(72.5, (float) $grade->score);
        $this->assertSame(1, $grade->version);
        $this->assertSame($this->asisten->id, $grade->graded_by);
    }

    public function test_one_invalid_row_saves_nothing()
    {
        $this->batch([
            $this->row($this->submissions[0], 90),
            $this->row($this->submissions[1], 150),
        ])->assertSessionHasErrors('grades.1.score');

        $this->assertSame(0, Grade::count());
    }

    public function test_submissions_from_other_targets_are_rejected()
    {
        $foreign = Submission::factory()->create();

        $this->batch([$this->row($foreign, 80)])->assertSessionHasErrors('grades.0.score');
        $this->assertSame(0, Grade::count());
    }

    public function test_stale_versions_are_rejected_to_prevent_overwrites()
    {
        $grade = Grade::factory()->for($this->submissions[0])->create(['score' => 70, 'version' => 2, 'graded_by' => User::factory()->asisten()]);

        $this->batch([$this->row($this->submissions[0], 95, version: 1)])->assertSessionHasErrors('grades.0.score');
        $this->assertSame(70.0, (float) $grade->fresh()->score);

        $this->batch([$this->row($this->submissions[0], 95, version: 2)])->assertSessionHasNoErrors();
        $this->assertSame(3, $grade->fresh()->version);
    }

    public function test_assistants_of_other_courses_cannot_grade()
    {
        $this->actingAs(User::factory()->asisten()->create());

        $this->batch([$this->row($this->submissions[0], 80)])->assertForbidden();
        $this->post(route('asisten.grading.publish', $this->target))->assertForbidden();
    }

    public function test_publishing_releases_only_filled_drafts_and_notifies()
    {
        Event::fake([GradesPublished::class]);
        Grade::factory()->for($this->submissions[0])->create(['score' => 80]);
        Grade::factory()->for($this->submissions[1])->create(['score' => null]);

        $this->post(route('asisten.grading.publish', $this->target))->assertRedirect();

        $this->assertTrue($this->submissions[0]->grade()->first()->isPublished());
        $this->assertFalse($this->submissions[1]->grade()->first()->isPublished());
        Event::assertDispatched(GradesPublished::class, fn ($event) => $event->userIds === [$this->submissions[0]->user_id]);
    }

    public function test_the_review_page_walks_through_submissions()
    {
        $this->get(route('asisten.grading.review', [$this->target, 'student' => $this->submissions[1]->user_id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('asisten/grades/review')
                ->where('current.userId', $this->submissions[1]->user_id)
                ->where('position.total', 3)
                ->has('students', 3));
    }

    public function test_grades_export_to_excel()
    {
        Grade::factory()->published()->for($this->submissions[0])->create(['score' => 90]);

        $response = $this->get(route('asisten.classes.grades.export', $this->class));
        $response->assertOk();
        $this->assertStringContainsString('.xlsx', $response->headers->get('content-disposition'));
    }

    public function test_students_only_see_published_grades()
    {
        $draft = Grade::factory()->for($this->submissions[0])->create(['score' => 55, 'feedback' => 'rahasia']);
        $this->actingAs($this->submissions[0]->user);

        $cell = fn (Assert $page) => $page->component('praktikan/grades')->where('courses.0.final', null);
        $this->get(route('praktikan.grades.index'))->assertOk()->assertInertia($cell);

        $draft->forceFill(['status' => 'published', 'published_at' => now()])->save();
        $this->get(route('praktikan.grades.index'))
            ->assertInertia(fn (Assert $page) => $page->where('courses.0.final', 55)->where('courses.0.letter', 'C'));
    }

    public function test_final_score_is_a_normalised_weighted_average()
    {
        $course = $this->class->course;
        $make = function (TaskType $type, float $score, int $max = 100) use ($course) {
            $task = Task::factory()->create(['course_id' => $course->id, 'type' => $type, 'max_score' => $max]);
            $target = TaskTarget::factory()->for($task)->create(['class_id' => $this->class->id]);

            return Grade::factory()->published()->for(Submission::factory()->for($target, 'target'))->create(['score' => $score])
                ->load('submission.target.task');
        };

        // 20/30/50: pretest 80, laporan 45/50 = 90 → (80·20 + 90·50) / 70 = 87.1
        $result = FinalScore::compute($course, [$make(TaskType::Pretest, 80), $make(TaskType::Report, 45, 50)]);

        $this->assertSame(80.0, $result['pretest']);
        $this->assertNull($result['posttest']);
        $this->assertSame(87.1, $result['final']);
        $this->assertSame('A', $result['letter']);
    }
}
