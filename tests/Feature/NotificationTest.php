<?php

namespace Tests\Feature;

use App\Actions\Announcement\NotifyAnnouncements;
use App\Actions\Schedule\NotifyScheduleChange;
use App\Actions\Task\RemindDeadlines;
use App\Enums\Position;
use App\Models\Announcement;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Room;
use App\Models\Semester;
use App\Models\Shift;
use App\Models\ShiftSwap;
use App\Models\Submission;
use App\Models\Task;
use App\Models\TaskTarget;
use App\Models\User;
use App\Notifications\LabNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * PRD Notifikasi (lonceng + email H-1) & Pengumuman (FR-ADM-08, FR-PD-6).
 */
class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_publishing_grades_notifies_students()
    {
        $asisten = User::factory()->asisten()->create();
        $class = LabClass::factory()->create();
        $class->assistants()->attach($asisten);
        $target = TaskTarget::factory()->create(['class_id' => $class->id, 'open_at' => now()->subDay()]);
        $student = Enrollment::factory()->for($class, 'labClass')->create()->user;
        Grade::factory()->for(Submission::factory()->for($target, 'target')->for($student))->create(['score' => 90]);

        $this->actingAs($asisten)->post(route('asisten.grading.publish', $target));

        $this->assertSame('grade', $student->notifications()->sole()->data['kind']);
    }

    public function test_shift_swap_requests_notify_the_target_and_approvals_notify_admins()
    {
        $this->travelTo(now()->setDate(2026, 10, 5)->setTime(9, 0));
        $semester = Semester::factory()->active()->create();
        $from = User::factory()->asisten()->create();
        $to = User::factory()->asisten()->create();
        $admin = User::factory()->admin()->create();
        $shift = Shift::create(['semester_id' => $semester->id, 'user_id' => $from->id, 'room_id' => Room::factory()->create()->id, 'date' => '2026-10-09', 'start_time' => '13:00', 'end_time' => '15:00']);

        $this->actingAs($from)->post(route('asisten.shift-swaps.store'), ['shift_id' => $shift->id, 'to_user_id' => $to->id, 'reason' => 'Ujian proposal']);
        $this->assertSame('Permintaan tukar shift', $to->notifications()->sole()->data['title']);

        $this->actingAs($to)->post(route('asisten.shift-swaps.respond', $to->notifications()->count() ? ShiftSwap::sole() : null), ['approve' => true]);
        $this->assertSame('Tukar shift disetujui', $from->notifications()->sole()->data['title']);
        $this->assertSame(1, $admin->notifications()->count());
    }

    public function test_submitted_reports_notify_the_secretary()
    {
        $this->travelTo(now()->setDate(2026, 10, 5)->setTime(12, 0));
        Semester::factory()->active()->create();
        $asisten = User::factory()->asisten()->create();
        $sekretaris = User::factory()->asisten(Position::SekretarisBendahara)->create();

        $this->actingAs($asisten)->post(route('asisten.reports.store'), [
            'date' => '2026-10-05', 'start_time' => '07:20', 'end_time' => '09:50', 'class_id' => LabClass::factory()->create()->id,
            'activity' => 'Jaga Lab', 'material' => 'OLAP', 'notes' => 'Kegiatan berjalan lancar.', 'assistant_ids' => [$asisten->id],
            'photo' => UploadedFile::fake()->image('dokumentasi.jpg'), 'submit' => true,
        ])->assertSessionHasNoErrors();

        $this->assertSame('report', $sekretaris->notifications()->sole()->data['kind']);
    }

    public function test_deadline_reminders_go_out_once_by_mail_to_students_who_have_not_submitted()
    {
        Notification::fake();
        $class = LabClass::factory()->create();
        $done = Enrollment::factory()->for($class, 'labClass')->create()->user;
        $pending = Enrollment::factory()->for($class, 'labClass')->create()->user;
        $target = TaskTarget::factory()->for(Task::factory())->create(['class_id' => $class->id, 'open_at' => now()->subDay(), 'due_at' => now()->addHours(20)]);
        Submission::factory()->for($target, 'target')->for($done)->create();

        $this->assertSame(1, app(RemindDeadlines::class)());
        $this->assertSame(0, app(RemindDeadlines::class)());

        Notification::assertSentTo($pending, LabNotification::class, fn (LabNotification $n, array $channels) => in_array('mail', $channels, true));
        Notification::assertNotSentTo($done, LabNotification::class);
    }

    public function test_announcements_respect_target_roles_classes_and_display_window()
    {
        $class = LabClass::factory()->create();
        $student = Enrollment::factory()->for($class, 'labClass')->create()->user;
        $outsider = User::factory()->create();

        $forAll = Announcement::factory()->create(['title' => 'Untuk semua']);
        Announcement::factory()->create(['title' => 'Khusus asisten', 'target_roles' => ['asisten']]);
        $classOnly = Announcement::factory()->create(['title' => 'Kelas saja', 'scope' => 'class', 'class_id' => $class->id]);
        Announcement::factory()->create(['title' => 'Terjadwal', 'publish_at' => now()->addDay()]);
        Announcement::factory()->create(['title' => 'Kedaluwarsa', 'expire_at' => now()->subMinute()]);

        $visible = fn (User $user) => Announcement::live()->visibleTo($user)->pluck('id')->sort()->values()->all();
        $this->assertSame([$forAll->id, $classOnly->id], $visible($student));
        $this->assertSame([$forAll->id], $visible($outsider));

        app(NotifyAnnouncements::class)();
        $this->assertSame(2, $student->notifications()->count());
        $this->assertSame(1, $outsider->notifications()->count());
    }

    public function test_admins_create_announcements_and_assistants_post_to_their_classes_only()
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->post(route('admin.announcements.store'), ['scope' => 'global', 'title' => 'Libur', 'body' => 'Lab tutup.', 'target_roles' => ['praktikan']])
            ->assertSessionHasNoErrors();
        $this->assertSame(['praktikan'], Announcement::sole()->target_roles);

        $asisten = User::factory()->asisten()->create();
        $mine = LabClass::factory()->create(['semester_id' => Semester::factory()->active()->create()->id]);
        $mine->assistants()->attach($asisten);
        $this->actingAs($asisten)->post(route('asisten.classes.announcements.store', $mine), ['title' => 'Topik baru', 'body' => 'Sudah rilis.'])->assertSessionHasNoErrors();
        $this->actingAs($asisten)->post(route('asisten.classes.announcements.store', LabClass::factory()->create()), ['title' => 'x', 'body' => 'y'])->assertForbidden();
    }

    public function test_the_bell_is_shared_and_reading_redirects_to_the_target()
    {
        $user = User::factory()->create();
        $user->notify(new LabNotification('grade', 'Nilai', 'Isi', '/praktikan/grade'));
        $user->notify(new LabNotification('info', 'Luar', 'Isi', 'https://evil.example'));

        $this->actingAs($user)->get(route('notifications.index'))
            ->assertInertia(fn (Assert $page) => $page->where('notifications.unread', 2)->has('notifications.items', 2));

        $grade = $user->notifications()->get()->firstWhere('data.title', 'Nilai');
        $this->get(route('notifications.read', $grade->id))->assertRedirect('/praktikan/grade');
        $this->assertNotNull($grade->fresh()->read_at);

        // Tautan eksternal tidak diikuti (open redirect).
        $evil = $user->notifications()->get()->firstWhere('data.title', 'Luar');
        $this->from('/notifications')->get(route('notifications.read', $evil->id))->assertRedirect('/notifications');

        $this->post(route('notifications.read-all'));
        $this->assertSame(0, $user->unreadNotifications()->count());
    }

    public function test_schedule_changes_notify_enrolled_students()
    {
        $asisten = User::factory()->asisten()->create();
        $class = LabClass::factory()->create(['start_time' => '07:20:00', 'end_time' => '09:50:00']);
        $class->assistants()->attach($asisten);
        $student = Enrollment::factory()->for($class, 'labClass')->create()->user;
        $meeting = Meeting::create(['class_id' => $class->id, 'number' => 3, 'date' => now()->addWeek()->toDateString()]);
        $payload = ['number' => 3, 'date' => now()->addWeeks(2)->toDateString(), 'topic' => 'Regresi', 'responsible_assistant_id' => $asisten->id];

        // FR-PS-04: tanggal & asisten pertemuan berubah → satu notifikasi.
        $this->actingAs($asisten)->put(route('asisten.meetings.update', $meeting), $payload)->assertSessionHasNoErrors();
        $notification = $student->notifications()->sole();
        $this->assertSame('Pertemuan 3 berubah', $notification->data['title']);
        $this->assertStringContainsString("asisten penanggung jawab kini {$asisten->name}", $notification->data['body']);

        // Simpan ulang tanpa perubahan jadwal (hanya materi) → tidak ada notifikasi baru.
        $this->put(route('asisten.meetings.update', $meeting), [...$payload, 'topic' => 'Regresi Linear']);
        $this->assertSame(1, $student->notifications()->count());

        // Jam "07:20" sama dengan "07:20:00"; ruang/jam yang benar-benar berubah memicu notifikasi.
        $notify = app(NotifyScheduleChange::class);
        $class->update(['start_time' => '07:20', 'end_time' => '09:50']);
        $notify->forClass($class);
        $this->assertSame(1, $student->notifications()->count());

        $class->update(['start_time' => '08:00', 'end_time' => '09:40']);
        $notify->forClass($class);
        $this->assertSame(['Jadwal kelas berubah', 'Pertemuan 3 berubah'], $student->notifications()->get()->pluck('data.title')->sort()->values()->all());
    }
}
