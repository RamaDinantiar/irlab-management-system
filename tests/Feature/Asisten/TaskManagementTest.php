<?php

namespace Tests\Feature\Asisten;

use App\Actions\Meeting\SyncMeetingSessions;
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
            'title' => 'Post-Test Pertemuan 04',
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
        // Kelas 07.20–09.50; sesi mulai otomatis pada jam mulai.
        $this->travelTo(today()->setTime(7, 0));
        $meeting = Meeting::factory()->for($this->classA, 'labClass')->create(['number' => 3, 'date' => today()]);

        $this->post(route('asisten.tasks.store'), $this->payload([
            'type' => 'pretest',
            'meeting_number' => 3,
            'targets' => [['class_id' => $this->classA->id, 'window_minutes' => 15]],
        ]))->assertSessionHasNoErrors();

        $target = TaskTarget::sole();
        $this->assertSame($meeting->id, $target->meeting_id);
        $this->assertSame('scheduled', $target->state());

        $this->travelTo(today()->setTime(7, 20));
        app(SyncMeetingSessions::class)();

        $this->assertNotNull($meeting->fresh()->started_at);
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

    public function test_create_and_edit_open_the_form_as_a_popup_on_the_index()
    {
        $task = Task::factory()->for($this->course)->create(['semester_id' => $this->course->semester_id, 'topic' => 'Room DB & DAO']);

        $this->get(route('asisten.tasks.create', ['type' => 'pretest']))
            ->assertInertia(fn (Assert $page) => $page->component('asisten/tasks/index')->where('openCreate', true)->where('editing', null));

        $this->get(route('asisten.tasks.edit', $task))
            ->assertInertia(fn (Assert $page) => $page
                ->component('asisten/tasks/index')
                ->where('editing.id', $task->id)
                ->where('editing.topic', 'Room DB & DAO')
                ->has('courses.0.classes.0.members')
            );

        $this->post(route('asisten.tasks.store'), $this->payload(['topic' => 'Entity & ViewModel']))->assertSessionHasNoErrors();
        $this->assertSame('Entity & ViewModel', Task::latest('id')->first()->topic);
    }

    public function test_assistants_extend_stop_and_manually_open_a_class()
    {
        $task = Task::factory()->for($this->course)->create(['semester_id' => $this->course->semester_id, 'allow_late' => true]);
        $live = TaskTarget::factory()->for($task)->create(['class_id' => $this->classA->id, 'due_at' => now()->addMinutes(10)]);
        $later = TaskTarget::factory()->for($task)->create(['class_id' => $this->classB->id, 'open_at' => now()->addDay(), 'due_at' => now()->addDays(2)]);

        $this->post(route('asisten.task-targets.extend', $live), ['minutes' => 15])->assertSessionHasNoErrors();
        $this->assertEqualsWithDelta(now()->addMinutes(25)->timestamp, $live->fresh()->due_at->timestamp, 5);
        $this->post(route('asisten.task-targets.extend', $live), ['minutes' => 7])->assertSessionHasErrors('minutes');

        // Berhenti mengunci form meskipun pengumpulan terlambat diizinkan.
        $this->post(route('asisten.task-targets.close', $live))->assertRedirect();
        $this->assertSame('closed', $live->fresh()->state());
        $this->post(route('asisten.task-targets.close', $live))->assertStatus(422);

        // Tambah Waktu membuka kembali kelas yang sudah dihentikan.
        $this->post(route('asisten.task-targets.extend', $live), ['minutes' => 10]);
        $this->assertSame('open', $live->fresh()->state());

        $this->post(route('asisten.task-targets.open', $later))->assertRedirect();
        $this->assertSame('open', $later->fresh()->state());
        $this->assertTrue($later->fresh()->due_at->isSameDay(now()->addDays(2)));
        $this->post(route('asisten.task-targets.open', $later))->assertStatus(422);

        $this->actingAs(User::factory()->asisten()->create())
            ->post(route('asisten.task-targets.close', $live))->assertForbidden();
    }

    public function test_stopped_classes_reject_submissions()
    {
        $task = Task::factory()->for($this->course)->create(['semester_id' => $this->course->semester_id, 'allow_late' => true, 'text_answer' => 'optional']);
        $target = TaskTarget::factory()->for($task)->create(['class_id' => $this->classA->id, 'closed_at' => now()->subMinute()]);
        $student = User::factory()->create();
        $this->classA->enrollments()->create(['user_id' => $student->id]);

        $this->actingAs($student)->post(route('praktikan.tasks.submit', $target), ['text' => 'jawaban'])
            ->assertSessionHasErrors(['submission' => 'Pengumpulan sudah dihentikan oleh asisten.']);
    }

    public function test_the_form_knows_which_class_sessions_are_running_today()
    {
        // Dalam jam kelas (07.20–09.50) sesi otomatis berjalan; yang diakhiri lebih awal tidak.
        $this->travelTo(today()->setTime(8, 0));
        $running = Meeting::factory()->create(['class_id' => $this->classA->id, 'number' => 3, 'date' => today()]);
        Meeting::factory()->create(['class_id' => $this->classB->id, 'number' => 3, 'date' => today(), 'ended_at' => now()->subMinutes(5)]);

        $this->get(route('asisten.tasks.index', ['type' => 'post-test']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('courses.0.classes.0.session.meetingNumber', 3)
                ->where('courses.0.classes.1.session', null)
            );

        // Akhiri Lebih Awal → mode Sesi Berjalan tidak tersedia lagi.
        $this->post(route('asisten.sessions.end', $running))->assertSessionHasNoErrors();
        $this->assertNotNull($running->fresh()->ended_at);
        $this->post(route('asisten.sessions.end', $running))->assertStatus(422);
        $this->get(route('asisten.tasks.index', ['type' => 'post-test']))
            ->assertInertia(fn (Assert $page) => $page->where('courses.0.classes.0.session', null));

        // Mode "Sesi Berjalan" mengirim jam hari ini sebagai open_at/due_at.
        $today = now()->format('Y-m-d');
        $this->post(route('asisten.tasks.store'), $this->payload(['meeting_number' => 3, 'targets' => [
            ['class_id' => $this->classA->id, 'open_at' => "{$today} 08:00", 'due_at' => "{$today} 23:59"],
        ]]))->assertSessionHasNoErrors();
        $this->assertSame("{$today} 23:59", TaskTarget::sole()->due_at->format('Y-m-d H:i'));
    }
}
