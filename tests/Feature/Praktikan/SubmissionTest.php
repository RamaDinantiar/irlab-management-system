<?php

namespace Tests\Feature\Praktikan;

use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\StoredFile;
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
 * US-P02 — Mengumpulkan tugas; FR-PT-01…05.
 */
class SubmissionTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private TaskTarget $target;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('lab');

        $class = LabClass::factory()->create();
        $this->student = Enrollment::factory()->for($class, 'labClass')->create()->user;
        $task = Task::factory()->create(['course_id' => $class->course_id, 'semester_id' => $class->semester_id, 'allowed_formats' => ['pdf']]);
        $class->semester->forceFill(['status' => 'active'])->save();
        $this->target = TaskTarget::factory()->for($task)->create(['class_id' => $class->id, 'open_at' => now()->subHour(), 'due_at' => now()->addDay()]);
        $this->actingAs($this->student);
    }

    private function submit(array $data)
    {
        return $this->post(route('praktikan.tasks.submit', $this->target), $data);
    }

    public function test_students_see_open_tasks_of_their_classes_only()
    {
        $other = TaskTarget::factory()->create(); // kelas lain
        $draft = TaskTarget::factory()->create(['class_id' => $this->target->class_id, 'task_id' => Task::factory()->draft()->create(['course_id' => $this->target->task->course_id, 'semester_id' => $this->target->task->semester_id])]);
        $scheduled = TaskTarget::factory()->create(['class_id' => $this->target->class_id, 'task_id' => Task::factory()->create(['course_id' => $this->target->task->course_id, 'semester_id' => $this->target->task->semester_id]), 'open_at' => now()->addDay()]);

        $this->get(route('praktikan.tasks.index'))
            ->assertInertia(fn (Assert $page) => $page->has('tasks', 1)->where('tasks.0.id', $this->target->id)->where('tasks.0.status', 'not_submitted'));

        foreach ([$other, $draft, $scheduled] as $hidden) {
            $this->get(route('praktikan.tasks.show', $hidden))->assertNotFound();
        }
    }

    public function test_a_pdf_submission_gets_a_receipt_with_server_time()
    {
        $this->submit(['file' => Pdf::upload('jawaban.pdf'), 'text_answer' => '```python\nprint(1)\n```'])
            ->assertSessionHasNoErrors();

        $submission = Submission::sole();
        $this->assertMatchesRegularExpression('/^IRL-\d{6}-\d{6}$/', $submission->receipt_number);
        $this->assertFalse($submission->is_late);
        $this->assertSame('jawaban.pdf', $submission->file->original_name);

        $this->get(route('praktikan.tasks.show', $this->target))
            ->assertInertia(fn (Assert $page) => $page
                ->where('task.status', 'submitted')
                ->where('history.0.receiptNumber', $submission->receipt_number)
                ->whereNot('history.0.sha256', null)
            );
    }

    public function test_the_detail_shows_the_class_schedule_and_assistants()
    {
        $class = $this->target->labClass;
        $class->assistants()->attach(User::factory()->asisten()->create(['name' => 'Rama Dinantiar']));

        $this->get(route('praktikan.tasks.show', $this->target))
            ->assertInertia(fn (Assert $page) => $page
                ->where('task.assistants', ['Rama Dinantiar'])
                ->where('task.schedule.dayOfWeek', $class->day_of_week)
                ->where('task.schedule.startTime', $class->startClock())
            );
    }

    public function test_only_the_allowed_formats_are_accepted()
    {
        $this->submit(['file' => Pdf::zip(['main.py' => 'x'])])->assertSessionHasErrors('file');
        $this->assertSame(0, Submission::count());
        $this->assertSame(0, StoredFile::count());
    }

    public function test_a_file_is_required_unless_text_is_mandatory()
    {
        $this->submit(['text_answer' => 'tanpa file'])->assertSessionHasErrors('file');

        $this->target->task->update(['text_answer' => 'required']);
        $this->submit(['text_answer' => ''])->assertSessionHasErrors('text_answer');
        $this->submit(['text_answer' => 'Jawaban'])->assertSessionHasNoErrors();
    }

    public function test_resubmitting_before_the_deadline_keeps_history()
    {
        $this->submit(['file' => Pdf::upload('v1.pdf')]);
        $this->submit(['file' => Pdf::upload('v2.pdf')]);

        $this->assertSame(2, Submission::count());
        $current = Submission::where('is_current', true)->sole();
        $this->assertSame(2, $current->version);
        $this->assertSame('v2.pdf', $current->file->original_name);
    }

    public function test_late_submissions_are_labelled_when_allowed()
    {
        $this->target->update(['due_at' => now()->subMinutes(135)]);
        $this->target->task->update(['allow_late' => true]);

        $this->submit(['file' => Pdf::upload()])->assertSessionHasNoErrors();

        $submission = Submission::sole();
        $this->assertTrue($submission->is_late);
        $this->assertSame('Terlambat 2 jam 15 menit', $submission->lateLabel());
    }

    public function test_late_submissions_are_rejected_when_not_allowed()
    {
        $this->target->update(['due_at' => now()->subMinute()]);

        $this->submit(['file' => Pdf::upload()])->assertSessionHasErrors('submission');
        $this->assertSame(0, Submission::count());
    }

    public function test_submissions_cannot_be_replaced_after_the_deadline()
    {
        $this->target->task->update(['allow_late' => true]);
        $this->submit(['file' => Pdf::upload()]);
        $this->target->update(['due_at' => now()->subMinute()]);

        $this->submit(['file' => Pdf::upload()])->assertSessionHasErrors('submission');
        $this->assertSame(1, Submission::count());
    }

    public function test_submitted_files_are_private_to_the_student_and_class_assistants()
    {
        $this->submit(['file' => Pdf::upload()]);
        $file = Submission::sole()->file;

        $this->get($file->url())->assertOk();

        $classmate = Enrollment::factory()->for($this->target->labClass, 'labClass')->create()->user;
        $this->actingAs($classmate)->get($file->url())->assertForbidden();

        $assistant = User::factory()->asisten()->create();
        $this->target->labClass->assistants()->attach($assistant);
        $this->actingAs($assistant)->get($file->url())->assertOk();
    }
}
