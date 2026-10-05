<?php

namespace Tests\Feature\Asisten;

use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * FR-AC-03: import praktikan ke kelas & ekspor anggota.
 */
class MemberImportTest extends TestCase
{
    use RefreshDatabase;

    public function test_assistants_import_existing_students_by_nim_and_get_a_failure_report()
    {
        $asisten = User::factory()->asisten()->create();
        $class = LabClass::factory()->create(['semester_id' => Semester::factory()->active()->create()->id, 'quota' => 30]);
        $class->assistants()->attach($asisten);
        $ok = User::factory()->create(['nim' => '202300001']);
        $already = Enrollment::factory()->for($class, 'labClass')->create()->user;
        $other = LabClass::factory()->create(['course_id' => $class->course_id, 'semester_id' => $class->semester_id]);
        $elsewhere = Enrollment::factory()->for($other, 'labClass')->create()->user;

        $csv = "nim\n202300001\n{$already->nim}\n{$elsewhere->nim}\n999999999\n";
        $this->actingAs($asisten)
            ->post(route('asisten.classes.members.import', $class), ['file' => UploadedFile::fake()->createWithContent('anggota.csv', $csv)])
            ->assertSessionHasNoErrors();

        $this->assertTrue($class->enrollments()->where('user_id', $ok->id)->exists());
        $this->assertSame(2, $class->enrollments()->count());
        $this->assertFalse($class->enrollments()->where('user_id', $elsewhere->id)->exists());
    }

    public function test_members_show_seat_and_average_and_export_to_excel()
    {
        $asisten = User::factory()->asisten()->create();
        $class = LabClass::factory()->create();
        $class->assistants()->attach($asisten);
        Enrollment::factory()->for($class, 'labClass')->create();

        $this->actingAs($asisten)->get(route('asisten.class.show', $class))
            ->assertInertia(fn (Assert $page) => $page->has('members.0', fn (Assert $m) => $m->hasAll(['seat', 'average'])->etc()));

        $this->get(route('asisten.classes.members.export', $class))->assertOk()->assertDownload();

        $this->actingAs(User::factory()->asisten()->create())->get(route('asisten.classes.members.export', $class))->assertForbidden();
    }
}
