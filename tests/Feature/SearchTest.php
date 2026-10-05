<?php

namespace Tests\Feature;

use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\Task;
use App\Models\TaskTarget;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Pencarian global sesuai peran.
 */
class SearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_results_are_scoped_to_the_role()
    {
        $class = LabClass::factory()->create();
        $student = Enrollment::factory()->for($class, 'labClass')->create(['user_id' => User::factory()->create(['name' => 'Zulkarnain Praktikan'])])->user;
        TaskTarget::factory()->for(Task::factory()->create(['course_id' => $class->course_id, 'title' => 'Post-Test Zulfikar']))->create(['class_id' => $class->id, 'open_at' => now()->subDay()]);
        TaskTarget::factory()->for(Task::factory()->create(['title' => 'Post-Test Zulu Lain']))->create(['open_at' => now()->subDay()]);

        $labels = fn ($response) => collect($response->json())->pluck('label')->all();

        // Praktikan: hanya tugas kelasnya.
        $res = $this->actingAs($student)->getJson(route('search', ['q' => 'Zul']))->assertOk();
        $this->assertSame(['Tugas'], $labels($res));
        $this->assertCount(1, $res->json('0.items'));

        // Asisten pengampu: praktikan & tugas kelasnya.
        $asisten = User::factory()->asisten()->create();
        $class->assistants()->attach($asisten);
        $res = $this->actingAs($asisten)->getJson(route('search', ['q' => 'Zul']));
        $this->assertSame(['Praktikan', 'Tugas'], $labels($res));

        // Admin: semua entitas, termasuk pengguna.
        $res = $this->actingAs(User::factory()->admin()->create())->getJson(route('search', ['q' => 'Zulkarnain']));
        $this->assertContains('Pengguna', $labels($res));

        $this->getJson(route('search', ['q' => 'Z']))->assertExactJson([]);
    }
}
