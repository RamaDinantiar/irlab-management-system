<?php

namespace Tests\Feature;

use App\Models\Program;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Program ditutup sementara (LAB_PROGRAMS_ENABLED=false): halaman "Belum
 * tersedia", aksi ditolak, data tetap utuh.
 */
class ProgramUnavailableTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['lab.features.programs' => false]);
    }

    public function test_program_pages_show_unavailable_for_every_role()
    {
        $program = Program::factory()->create();

        $this->actingAs(User::factory()->create())
            ->get(route('praktikan.programs.index', 'quick-tutor'))
            ->assertInertia(fn (Assert $page) => $page->component('program-unavailable')->where('program', 'Quick Tutor'));
        $this->get(route('praktikan.programs.show', $program))
            ->assertInertia(fn (Assert $page) => $page->component('program-unavailable')->where('program', $program->type->label()));

        foreach ([User::factory()->asisten()->create(), User::factory()->admin()->create()] as $staff) {
            $this->actingAs($staff)->get(route('asisten.programs.index', 'maintenance'))
                ->assertInertia(fn (Assert $page) => $page->component('program-unavailable')->where('program', 'Maintenance'));
        }
    }

    public function test_program_actions_are_blocked_and_data_kept()
    {
        $program = Program::factory()->create();

        $this->actingAs(User::factory()->asisten()->create())
            ->delete(route('asisten.programs.destroy', $program))->assertRedirect();
        $this->actingAs(User::factory()->create())
            ->post(route('praktikan.programs.register', $program), ['answers' => []])->assertRedirect();

        $this->assertModelExists($program);
        $this->assertSame(0, $program->registrations()->count());
    }
}
