<?php

namespace Tests\Feature\Asisten;

use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * FR-AC-03 (anggota kelas) & FR-ENR-04 (keluarkan dengan alasan).
 */
class MemberTest extends TestCase
{
    use RefreshDatabase;

    private User $asisten;

    private LabClass $class;

    protected function setUp(): void
    {
        parent::setUp();

        $this->asisten = User::factory()->asisten()->create();
        $this->class = LabClass::factory()->create();
        $this->class->assistants()->attach($this->asisten);
        $this->actingAs($this->asisten);
    }

    public function test_assistants_see_the_members_of_their_class()
    {
        Enrollment::factory()->count(3)->for($this->class, 'labClass')->create();

        $this->get(route('asisten.class.show', $this->class))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('asisten/class/show')
                ->has('members', 3)
                ->where('klass.membersCount', 3)
            );
    }

    public function test_other_assistants_cannot_see_the_members()
    {
        $this->actingAs(User::factory()->asisten()->create())
            ->get(route('asisten.class.show', $this->class))
            ->assertForbidden();
    }

    public function test_removing_requires_a_reason_and_keeps_the_record()
    {
        $enrollment = Enrollment::factory()->for($this->class, 'labClass')->create();
        $route = route('asisten.classes.members.destroy', ['class' => $this->class, 'enrollment' => $enrollment]);

        $this->delete($route, ['reason' => ''])->assertSessionHasErrors('reason');

        $this->delete($route, ['reason' => 'Salah kelas, pindah ke Kelas B.'])->assertRedirect();

        $this->assertSoftDeleted($enrollment);
        $this->assertSame('Salah kelas, pindah ke Kelas B.', $enrollment->fresh()->removed_reason);
        $this->assertSame($this->asisten->id, $enrollment->fresh()->removed_by);
        $this->assertDatabaseHas('audit_logs', ['action' => 'enrollment.removed']);
    }

    public function test_enrollments_of_other_classes_cannot_be_removed_through_this_class()
    {
        $foreign = Enrollment::factory()->create();

        $this->delete(route('asisten.classes.members.destroy', ['class' => $this->class, 'enrollment' => $foreign]), ['reason' => 'Coba-coba'])
            ->assertNotFound();
    }
}
