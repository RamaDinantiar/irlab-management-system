<?php

namespace Tests\Feature\Praktikan;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * US-P01 — Gabung kelas dengan token (FR-ENR-01…05).
 */
class JoinClassTest extends TestCase
{
    use RefreshDatabase;

    private User $student;

    private LabClass $class;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->create();
        $course = Course::factory()->for(Semester::factory()->active())->create(['name' => 'Machine Learning']);
        $this->class = LabClass::factory()->create([
            'course_id' => $course->id,
            'semester_id' => $course->semester_id,
            'name' => 'Kelas A',
            'join_token' => 'ABC234',
            'quota' => 3,
        ]);
        $this->actingAs($this->student);
    }

    private function join(string $token)
    {
        return $this->post(route('praktikan.enrollments.store'), ['token' => $token]);
    }

    public function test_a_valid_token_enrolls_the_student()
    {
        $this->join('ABC234')->assertSessionHasNoErrors()->assertRedirect();

        $this->assertDatabaseHas('enrollments', ['class_id' => $this->class->id, 'user_id' => $this->student->id]);
    }

    public function test_tokens_are_case_insensitive_and_trimmed()
    {
        $this->join('  abc234 ')->assertSessionHasNoErrors();

        $this->assertSame(1, Enrollment::count());
    }

    public function test_unknown_tokens_do_not_reveal_other_classes()
    {
        $this->join('ZZZ999')->assertSessionHasErrors(['token' => 'Kode kelas tidak ditemukan.']);
        $this->join('ABC2')->assertSessionHasErrors(['token' => 'Kode kelas tidak ditemukan.']);
    }

    public function test_tokens_of_archived_semesters_are_not_found()
    {
        $this->class->semester->forceFill(['status' => 'archived'])->save();

        $this->join('ABC234')->assertSessionHasErrors(['token' => 'Kode kelas tidak ditemukan.']);
    }

    public function test_locked_or_full_classes_are_closed()
    {
        $this->class->forceFill(['is_locked' => true])->save();
        $this->join('ABC234')->assertSessionHasErrors(['token' => 'Kelas sudah ditutup, hubungi asisten.']);

        $this->class->forceFill(['is_locked' => false])->save();
        Enrollment::factory()->count(3)->for($this->class, 'labClass')->create();
        $this->join('ABC234')->assertSessionHasErrors(['token' => 'Kelas sudah ditutup, hubungi asisten.']);
    }

    public function test_joining_twice_is_reported()
    {
        $this->join('ABC234');

        $this->join('ABC234')->assertSessionHasErrors(['token' => 'Anda sudah tergabung di kelas ini.']);
        $this->assertSame(1, Enrollment::count());
    }

    public function test_one_class_per_course_per_semester()
    {
        $otherClass = LabClass::factory()->create([
            'course_id' => $this->class->course_id,
            'semester_id' => $this->class->semester_id,
            'name' => 'Kelas B',
            'join_token' => 'XYZ789',
        ]);

        $this->join('ABC234');
        $this->join('XYZ789')->assertSessionHasErrors('token');

        $this->assertDatabaseMissing('enrollments', ['class_id' => $otherClass->id]);
    }

    public function test_the_class_locks_automatically_when_full()
    {
        Enrollment::factory()->count(2)->for($this->class, 'labClass')->create();

        $this->join('ABC234')->assertSessionHasNoErrors();

        $this->assertTrue($this->class->fresh()->is_locked);
        $this->assertDatabaseHas('audit_logs', ['action' => 'class.auto_locked', 'auditable_id' => $this->class->id]);
    }

    public function test_five_wrong_tokens_per_ten_minutes()
    {
        RateLimiter::clear('join-class:'.$this->student->id);

        foreach (range(1, 5) as $_) {
            $this->join('ZZZ999');
        }

        $this->join('ABC234')->assertSessionHasErrors('token');
        $this->assertSame(0, Enrollment::count());
        $this->assertStringContainsString('Terlalu banyak percobaan', session('errors')->first('token'));
    }

    public function test_removed_students_can_rejoin_with_the_token()
    {
        $this->join('ABC234');
        Enrollment::sole()->delete();

        $this->join('ABC234')->assertSessionHasNoErrors();

        $this->assertSame(1, Enrollment::count());
    }

    public function test_only_praktikan_can_join()
    {
        $this->actingAs(User::factory()->asisten()->create())
            ->post(route('praktikan.enrollments.store'), ['token' => 'ABC234'])
            ->assertForbidden();
    }

    public function test_the_class_page_and_dashboard_show_enrolled_classes()
    {
        $this->join('ABC234');

        $this->get(route('praktikan.class.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->has('classes', 1)
                ->where('classes.0.name', 'Kelas A')
                ->missing('classes.0.joinToken')
            );

        $this->get(route('praktikan.dashboard'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('dashboard.hasClasses', true)
                ->where('dashboard.week.events.0.title', 'Machine Learning')
                ->where('dashboard.nextClass.className', 'Kelas A')
            );
    }

    public function test_students_without_classes_get_the_getting_started_state()
    {
        $this->get(route('praktikan.dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('dashboard.hasClasses', false));
    }
}
