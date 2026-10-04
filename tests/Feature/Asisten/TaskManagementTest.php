<?php

namespace Tests\Feature\Asisten;

use App\Enums\TaskType;
use App\Models\Course;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Semester;
use App\Models\Submission;
use App\Models\Task;
use App\Models\TaskTarget;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\Pdf;
use Tests\TestCase;

/**
 * FR-AT-01…06 — Task Management.
 */
class TaskManagementTest extends TestCase
{
    use RefreshDatabase;

    private User $asisten;

    private Course $course;

    private LabClass $classA;

    private LabClass $classB;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('lab');

        $this->asisten = User::factory()->asisten()->create();
        $this->course = Course::factory()->for(Semester::factory()->active())->create();
        $this->course->assistants()->attach($this->asisten);
        [$this->classA, $this->classB] = LabClass::factory()->count(2)->sequence(['name' => 'Kelas A'], ['name' => 'Kelas B'])->create([
            'course_id' => $this->course->id, 'semester_id' => $this->course->semester_id,
        ])->all();
        $this->classA->assistants()->attach($this->asisten);
        $this->classB->assistants()->attach($this->asisten);
        $this->actingAs($this->asisten);
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'intent' => 'publish',
            'course_id' => $this->course->id,
            'type' => 'posttest',
            'title' => 'Post-Test Modul 04',
            'body' => json_encode(['type' => 'doc', 'content' => [['type' => 'codeBlock', 'attrs' => ['language' => 'python'], 'content' => [['type' => 'text', 'text' => 'print(1)']]]]]),
            'max_score' => 100,
            'allowed_formats' => ['pdf'],
            'text_answer' => 'optional',
            'targets' => [
                ['class_id' => $this->classA->id, 'open_at' => '2026-10-05 08:00', 'due_at' => '2026-10-07 23:59'],
                ['class_id' => $this->classB->id, 'open_at' => '2026-10-06 08:00', 'due_at' => '2026-10-08 23:59'],
            ],
            ...$overrides,
        ];
    }

    public function test_a_task_is_published_to_several_classes_with_different_deadlines()
    {
        $this->post(route('asisten.tasks.store'), $this->payload(['attachments' => [Pdf::upload('soal.pdf')]]))
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('asisten.tasks.index', ['type' => 'post-test']));

        $task = Task::sole();
        $this->assertTrue($task->isPublished());
        $this->assertSame('python', $task->body_json['content'][0]['attrs']['language']);
        $this->assertCount(2, $task->targets);
        $this->assertSame('2026-10-08 23:59', $task->targets->firstWhere('class_id', $this->classB->id)->due_at->format('Y-m-d H:i'));
        $this->assertCount(1, $task->attachments);
        $this->assertNotNull($task->targets->first()->published_at);
    }

    public function test_drafts_can_be_saved_without_deadlines()
    {
        $this->post(route('asisten.tasks.store'), $this->payload(['intent' => 'draft', 'targets' => [['class_id' => $this->classA->id]]]))
            ->assertSessionHasNoErrors();

        $this->assertSame('draft', Task::sole()->status);
        $this->assertSame('draft', TaskTarget::sole()->state());
    }

    public function test_publishing_requires_deadlines_and_at_least_one_class()
    {
        $this->post(route('asisten.tasks.store'), $this->payload(['targets' => []]))->assertSessionHasErrors('targets');
        $this->post(route('asisten.tasks.store'), $this->payload(['targets' => [['class_id' => $this->classA->id, 'open_at' => '2026-10-05 08:00']]]))
            ->assertSessionHasErrors('targets.0.due_at');
        $this->post(route('asisten.tasks.store'), $this->payload(['targets' => [['class_id' => $this->classA->id, 'open_at' => '2026-10-05 08:00', 'due_at' => '2026-10-04 08:00']]]))
            ->assertSessionHasErrors('targets.0.due_at');
    }

    public function test_an_answer_channel_is_required()
    {
        $this->post(route('asisten.tasks.store'), $this->payload(['allowed_formats' => [], 'text_answer' => 'none']))
            ->assertSessionHasErrors('allowed_formats');
    }

    public function test_only_classes_of_the_course_taught_by_the_assistant()
    {
        $foreign = LabClass::factory()->create();

        $this->post(route('asisten.tasks.store'), $this->payload(['targets' => [['class_id' => $foreign->id, 'open_at' => '2026-10-05 08:00', 'due_at' => '2026-10-06 08:00']]]))
            ->assertSessionHasErrors('targets.0.class_id');

        $this->actingAs(User::factory()->asisten()->create())
            ->post(route('asisten.tasks.store'), $this->payload())
            ->assertForbidden();
    }

    public function test_a_pretest_opens_when_the_session_starts()
    {
        $meeting = Meeting::factory()->for($this->classA, 'labClass')->create(['number' => 3]);

        $this->post(route('asisten.tasks.store'), $this->payload([
            'type' => 'pretest',
            'meeting_number' => 3,
            'targets' => [['class_id' => $this->classA->id, 'window_minutes' => 15]],
        ]))->assertSessionHasNoErrors();

        $target = TaskTarget::sole();
        $this->assertSame($meeting->id, $target->meeting_id);
        $this->assertSame('scheduled', $target->state());

        $this->post(route('asisten.sessions.start', $meeting));

        $target->refresh();
        $this->assertSame('open', $target->state());
        $this->assertEqualsWithDelta(15, $target->open_at->diffInMinutes($target->due_at), 0.1);
    }

    public function test_tasks_can_be_duplicated_as_draft()
    {
        $task = Task::factory()->for($this->course)->create(['semester_id' => $this->course->semester_id]);

        $this->post(route('asisten.tasks.duplicate', $task))->assertRedirect();

        $copy = Task::latest('id')->first();
        $this->assertSame('draft', $copy->status);
        $this->assertStringContainsString('(salinan)', $copy->title);
        $this->assertCount(0, $copy->targets);
    }

    public function test_tasks_with_submissions_cannot_be_deleted_and_their_targets_are_kept()
    {
        $task = Task::factory()->for($this->course)->create(['semester_id' => $this->course->semester_id]);
        $target = TaskTarget::factory()->for($task)->create(['class_id' => $this->classA->id]);
        Submission::factory()->for($target, 'target')->create();

        $this->delete(route('asisten.tasks.destroy', $task))->assertStatus(422);

        $this->put(route('asisten.tasks.update', $task), $this->payload(['targets' => [['class_id' => $this->classB->id, 'open_at' => '2026-10-05 08:00', 'due_at' => '2026-10-06 08:00']]]))
            ->assertSessionHasErrors('targets');
    }

    public function test_the_index_lists_progress_per_class()
    {
        $task = Task::factory()->for($this->course)->create(['semester_id' => $this->course->semester_id, 'type' => TaskType::Report]);
        TaskTarget::factory()->for($task)->create(['class_id' => $this->classA->id]);

        $this->get(route('asisten.tasks.index', ['type' => 'laporan']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('asisten/tasks/index')
                ->has('tasks', 1)
                ->where('tasks.0.targets.0.state', 'open')
            );

        $this->get(route('asisten.tasks.index', ['type' => 'pre-test']))
            ->assertInertia(fn (Assert $page) => $page->has('tasks', 0));
    }

    public function test_admin_can_manage_tasks_of_every_course()
    {
        $this->actingAs(User::factory()->admin()->create())
            ->post(route('asisten.tasks.store'), $this->payload())
            ->assertSessionHasNoErrors();
    }
}
