<?php

namespace Tests\Feature;

use App\Enums\ProgramType;
use App\Models\Program;
use App\Models\ProgramRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\Support\Pdf;
use Tests\TestCase;

/**
 * FR-APR-01…04 (Asisten) & FR-PP-01…03 (Praktikan).
 */
class ProgramTest extends TestCase
{
    use RefreshDatabase;

    private User $asisten;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('lab');
        $this->asisten = User::factory()->asisten()->create();
        $this->student = User::factory()->create();
    }

    private function workshopPayload(array $overrides = []): array
    {
        return [
            'type' => 'workshop', 'title' => 'Hands-on RAG', 'description' => 'Pelatihan RAG.', 'speaker_name' => 'Dr. Hendra',
            'mode' => 'offline', 'location' => 'Lab IR 1', 'starts_at' => now()->addWeek()->format('Y-m-d H:i'), 'quota' => 2,
            'closes_at' => now()->addDays(3)->format('Y-m-d H:i'), 'intent' => 'publish', ...$overrides,
        ];
    }

    public function test_assistants_publish_a_workshop_with_a_default_form()
    {
        $this->actingAs($this->asisten)->post(route('asisten.programs.store'), $this->workshopPayload())->assertSessionHasNoErrors();

        $program = Program::sole();
        $this->assertSame('open', $program->status);
        $this->assertSame(2, $program->fields()->count());
        $this->assertTrue($program->isAcceptingRegistrations());

        $this->get(route('asisten.programs.index', 'workshop'))->assertInertia(fn (Assert $page) => $page->component('asisten/programs/index')->where('stats.open', 1));
    }

    public function test_students_register_and_quota_is_enforced()
    {
        $program = Program::factory()->create(['quota' => 1]);
        $field = $program->fields()->create(['order' => 1, 'label' => 'Nomor WhatsApp', 'type' => 'text', 'required' => true]);

        $this->actingAs($this->student)->post(route('praktikan.programs.register', $program), ['answers' => []])->assertSessionHasErrors("answers.{$field->id}");
        $this->post(route('praktikan.programs.register', $program), ['answers' => [$field->id => '0812']])->assertSessionHasNoErrors();
        $this->post(route('praktikan.programs.register', $program), ['answers' => [$field->id => '0812']])->assertSessionHasErrors('program');

        $this->actingAs(User::factory()->create())->post(route('praktikan.programs.register', $program), ['answers' => [$field->id => '0813']])->assertSessionHasErrors('program');
        $this->assertSame(1, ProgramRegistration::count());
    }

    public function test_file_answers_are_validated_and_stored()
    {
        $program = Program::factory()->type(ProgramType::Recruitment)->create();
        $cv = $program->fields()->create(['order' => 1, 'label' => 'CV', 'type' => 'file', 'required' => true, 'rules_json' => ['formats' => ['pdf'], 'max_mb' => 5]]);
        $this->actingAs($this->student);

        $this->post(route('praktikan.programs.register', $program), ['answers' => [$cv->id => Pdf::upload('cv.zip')]])->assertSessionHasErrors("answers.{$cv->id}");
        $this->post(route('praktikan.programs.register', $program), ['answers' => [$cv->id => Pdf::upload('cv.pdf')]])->assertSessionHasNoErrors();

        $registration = ProgramRegistration::sole();
        $this->assertSame('cv.pdf', $registration->answers_json[(string) $cv->id]['name']);
        $this->assertCount(1, $registration->files);
    }

    public function test_only_students_can_register_and_closed_programs_reject()
    {
        $program = Program::factory()->create();
        $this->actingAs($this->asisten)->post(route('praktikan.programs.register', $program), ['answers' => []])->assertForbidden();

        $closed = Program::factory()->create(['status' => 'closed']);
        $this->actingAs($this->student)->post(route('praktikan.programs.register', $closed), ['answers' => []])->assertSessionHasErrors('program');

        $maintenance = Program::factory()->type(ProgramType::Maintenance)->create(['status' => 'open']);
        $this->get(route('praktikan.programs.show', $maintenance))->assertNotFound();
    }

    public function test_recruitment_opens_only_when_ready()
    {
        $program = Program::factory()->type(ProgramType::Recruitment)->create(['status' => 'draft', 'requirements' => null, 'opens_at' => now(), 'closes_at' => now()->addWeek()]);
        $this->actingAs($this->asisten);

        $this->post(route('asisten.programs.status', $program), ['status' => 'open'])->assertSessionHasErrors('status');

        $this->put(route('asisten.programs.stages', $program), [
            'stages' => [['name' => 'Seleksi Berkas', 'start_at' => '2026-10-10', 'end_at' => '2026-10-15'], ['name' => 'Wawancara', 'start_at' => '2026-10-20', 'end_at' => '2026-10-22']],
            'requirements' => ['IPK minimal 3.25'],
        ])->assertSessionHasNoErrors();
        $this->put(route('asisten.programs.fields', $program), ['fields' => [['label' => 'CV', 'type' => 'file', 'required' => true, 'formats' => ['pdf'], 'max_mb' => 5]]])->assertSessionHasNoErrors();

        $this->assertTrue($program->fresh()->isReady());
        $this->post(route('asisten.programs.status', $program), ['status' => 'open'])->assertSessionHasNoErrors();
        $this->assertSame('open', $program->fresh()->status);
    }

    public function test_the_pipeline_advances_or_rejects_applicants_and_notifies_them()
    {
        $program = Program::factory()->type(ProgramType::Recruitment)->create();
        [$docs, $interview] = [$program->stages()->create(['order' => 1, 'name' => 'Seleksi Berkas']), $program->stages()->create(['order' => 2, 'name' => 'Wawancara'])];
        $a = ProgramRegistration::factory()->for($program)->create(['current_stage_id' => $docs->id]);
        $b = ProgramRegistration::factory()->for($program)->create(['current_stage_id' => $docs->id]);
        $this->actingAs($this->asisten);

        $this->post(route('asisten.program-registrations.review', $a), ['pass' => true, 'note' => 'Berkas lengkap']);
        $this->assertSame(['passed_docs', $interview->id], [$a->fresh()->status, $a->fresh()->current_stage_id]);

        $this->post(route('asisten.program-registrations.review', $a), ['pass' => true]);
        $this->assertSame('accepted', $a->fresh()->status);

        $this->post(route('asisten.program-registrations.review', $b), ['pass' => false, 'note' => 'IPK kurang']);
        $this->assertSame('rejected', $b->fresh()->status);
        $this->assertSame('IPK kurang', $b->fresh()->stage_results[(string) $docs->id]['note']);

        $this->assertSame(2, $a->user->notifications()->count());
    }

    public function test_forms_lock_after_registrations_and_attendance_and_export_work()
    {
        $program = Program::factory()->create();
        $registration = ProgramRegistration::factory()->for($program)->create();
        $this->actingAs($this->asisten);

        $this->put(route('asisten.programs.fields', $program), ['fields' => []])->assertSessionHasErrors('fields');

        $this->post(route('asisten.program-registrations.attendance', $registration), ['attended' => true]);
        $this->assertTrue($registration->fresh()->attended);

        $this->get(route('asisten.programs.export', $program))->assertOk()->assertDownload();
    }

    public function test_maintenance_logs_record_staff_and_results()
    {
        $this->actingAs($this->asisten)->post(route('asisten.programs.store'), [
            'type' => 'maintenance', 'title' => 'Update OS Lab IR 1', 'description' => 'PC-01 s.d. PC-20', 'starts_at' => now()->format('Y-m-d H:i'),
            'staff_ids' => [$this->asisten->id], 'result_notes' => 'Selesai.',
        ])->assertSessionHasNoErrors();

        $log = Program::sole();
        $this->assertSame(ProgramType::Maintenance, $log->type);
        $this->assertSame([$this->asisten->id], $log->staff_ids);
        $this->assertFalse($log->fields()->exists());
    }

    public function test_students_see_the_catalog_and_their_programs()
    {
        $open = Program::factory()->create();
        Program::factory()->create(['status' => 'draft']);
        ProgramRegistration::factory()->for($open)->for($this->student)->create();

        $this->actingAs($this->student)->get(route('praktikan.programs.index'))
            ->assertInertia(fn (Assert $page) => $page->component('praktikan/programs/index')->has('programs', 1)->where('programs.0.myStatus', 'registered')->has('mine', 1));
    }
}
