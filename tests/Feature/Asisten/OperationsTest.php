<?php

namespace Tests\Feature\Asisten;

use App\Actions\Honor\ComputeHonorRecaps;
use App\Actions\Shift\SwapShift;
use App\Enums\Position;
use App\Jobs\GenerateMonthlyReport;
use App\Models\Export;
use App\Models\HonorRate;
use App\Models\HonorRecap;
use App\Models\Room;
use App\Models\Semester;
use App\Models\Shift;
use App\Models\ShiftSwap;
use App\Models\SupervisionReport;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;
use ZipArchive;

/**
 * US-A03 (Laporan Ngawas), US-A04 (Generate), US-A05 (Tukar Shift), FR-AGN-03 (honor).
 */
class OperationsTest extends TestCase
{
    use RefreshDatabase;

    private User $asisten;

    private User $sekretaris;

    private Semester $semester;

    private Room $room;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('lab');
        $this->travelTo(CarbonImmutable::parse('2026-10-05 10:00'));

        $this->semester = Semester::factory()->active()->create(['start_date' => '2026-09-01', 'end_date' => '2027-01-31']);
        $this->room = Room::factory()->create();
        $this->asisten = User::factory()->asisten()->create();
        $this->sekretaris = User::factory()->asisten(Position::Sekretaris)->create();
    }

    private function shift(User $user, string $date, string $start = '13:00', string $end = '16:00'): Shift
    {
        return Shift::create(['semester_id' => $this->semester->id, 'user_id' => $user->id, 'room_id' => $this->room->id, 'title' => 'Jaga Lab', 'date' => $date, 'start_time' => $start, 'end_time' => $end]);
    }

    private function payload(array $overrides = []): array
    {
        return [
            'date' => '2026-10-05', 'start_time' => '07:20', 'end_time' => '09:50',
            'activity' => 'Jaga Lab', 'material' => 'OLAP', 'present_count' => 28, 'lab_condition' => 'baik',
            'notes' => 'Praktikum berjalan lancar tanpa kendala.', 'assistant_ids' => [$this->asisten->id],
            ...$overrides,
        ];
    }

    public function test_a_report_is_saved_as_draft_then_submitted_with_a_photo()
    {
        $shift = $this->shift($this->asisten, '2026-10-05', '07:20', '09:50');
        $this->actingAs($this->asisten);

        $this->post(route('asisten.reports.store'), $this->payload(['shift_id' => $shift->id]))->assertSessionHasNoErrors();
        $report = SupervisionReport::sole();
        $this->assertSame('draft', $report->status);
        $this->assertSame('2026-10-06 23:59:59', $report->editable_until->format('Y-m-d H:i:s'));

        $photo = UploadedFile::fake()->image('dokumentasi.jpg');
        $this->post(route('asisten.reports.update', $report), $this->payload(['shift_id' => $shift->id, 'submit' => true, 'photo' => $photo]))->assertSessionHasNoErrors();
        $this->assertSame('submitted', $report->fresh()->status);
        $this->assertCount(1, $report->photos);
    }

    public function test_the_author_must_be_in_the_team_and_dates_cannot_be_in_the_future()
    {
        $this->actingAs($this->asisten);

        $this->post(route('asisten.reports.store'), $this->payload(['assistant_ids' => [$this->sekretaris->id]]))->assertSessionHasErrors('assistant_ids');
        $this->post(route('asisten.reports.store'), $this->payload(['date' => '2026-10-06']))->assertSessionHasErrors('date');
        $this->post(route('asisten.reports.store'), $this->payload(['end_time' => '07:00']))->assertSessionHasErrors('end_time');
    }

    public function test_reports_lock_after_h_plus_one_and_admins_can_unlock()
    {
        $this->actingAs($this->asisten)->post(route('asisten.reports.store'), $this->payload(['date' => '2026-10-03']));
        $report = SupervisionReport::sole();

        $this->post(route('asisten.reports.update', $report), $this->payload(['date' => '2026-10-03', 'notes' => 'Diubah setelah terkunci.']))->assertSessionHasErrors('report');

        $this->actingAs(User::factory()->admin()->create())->post(route('asisten.reports.unlock', $report))->assertSessionHasNoErrors();
        $this->actingAs($this->asisten)->post(route('asisten.reports.update', $report), $this->payload(['date' => '2026-10-03', 'notes' => 'Diubah setelah dibuka kuncinya.']))->assertSessionHasNoErrors();
    }

    public function test_the_secretary_verifies_or_returns_submitted_reports()
    {
        $this->actingAs($this->asisten)->post(route('asisten.reports.store'), $this->payload(['submit' => true]));
        $report = SupervisionReport::sole();

        // Asisten biasa tidak boleh memverifikasi.
        $this->actingAs(User::factory()->asisten()->create())->post(route('asisten.reports.verify', $report))->assertForbidden();

        $this->actingAs($this->sekretaris)->post(route('asisten.reports.return', $report), ['note' => 'Jumlah hadir belum sesuai.'])->assertSessionHasNoErrors();
        $this->assertSame('returned', $report->fresh()->status);

        $this->actingAs($this->asisten)->post(route('asisten.reports.update', $report), $this->payload(['submit' => true, 'present_count' => 27]));
        $this->actingAs($this->sekretaris)->post(route('asisten.reports.verify', $report))->assertSessionHasNoErrors();
        $this->assertSame('verified', $report->fresh()->status);

        // Laporan terverifikasi tidak dapat diubah lagi.
        $this->actingAs($this->asisten)->post(route('asisten.reports.update', $report), $this->payload())->assertSessionHasErrors('report');
    }

    public function test_the_report_page_autofills_unreported_shifts()
    {
        $shift = $this->shift($this->asisten, '2026-10-05', '07:20', '09:50');

        $this->actingAs($this->asisten)->get(route('asisten.reports.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('asisten/report')->where('pendingShifts.0.id', $shift->id));
    }

    public function test_shift_swaps_require_the_target_to_approve()
    {
        $shift = $this->shift($this->asisten, '2026-10-09');
        $target = User::factory()->asisten()->create();
        $this->actingAs($this->asisten);

        $this->post(route('asisten.shift-swaps.store'), ['shift_id' => $shift->id, 'to_user_id' => $target->id, 'reason' => 'Ujian tengah semester'])->assertSessionHasNoErrors();
        $swap = ShiftSwap::sole();
        $this->assertSame('pending', $swap->status);

        // Hanya asisten tujuan yang bisa menjawab.
        $this->post(route('asisten.shift-swaps.respond', $swap), ['approve' => true])->assertForbidden();

        $this->actingAs($target)->post(route('asisten.shift-swaps.respond', $swap), ['approve' => true])->assertSessionHasNoErrors();
        $this->assertSame($target->id, $shift->fresh()->user_id);
        $this->assertSame('approved', $swap->fresh()->status);
    }

    public function test_swaps_to_assistants_with_overlapping_shifts_or_too_late_are_rejected()
    {
        $busy = User::factory()->asisten()->create();
        $this->shift($busy, '2026-10-09', '14:00', '15:00');
        $this->actingAs($this->asisten);

        $this->post(route('asisten.shift-swaps.store'), ['shift_id' => $this->shift($this->asisten, '2026-10-09')->id, 'to_user_id' => $busy->id, 'reason' => 'Ada keperluan'])
            ->assertSessionHasErrors('to_user_id');

        // < 24 jam sebelum shift.
        $this->post(route('asisten.shift-swaps.store'), ['shift_id' => $this->shift($this->asisten, '2026-10-05', '20:00', '21:00')->id, 'to_user_id' => User::factory()->asisten()->create()->id, 'reason' => 'Ada keperluan'])
            ->assertSessionHasErrors('shift_id');
    }

    public function test_pending_swaps_expire_24_hours_before_the_shift()
    {
        $swap = ShiftSwap::create(['shift_id' => $this->shift($this->asisten, '2026-10-07')->id, 'from_user_id' => $this->asisten->id, 'to_user_id' => $this->sekretaris->id, 'reason' => 'x']);

        $this->assertSame(0, SwapShift::expireStale());
        $this->travelTo(CarbonImmutable::parse('2026-10-06 13:30'));
        $this->assertSame(1, SwapShift::expireStale());
        $this->assertSame('expired', $swap->fresh()->status);
    }

    public function test_honor_counts_verified_hours_for_every_team_member()
    {
        HonorRate::create(['rate_per_hour' => 25000, 'effective_from' => '2026-09-01']);
        $partner = User::factory()->asisten()->create();

        $report = SupervisionReport::factory()->create(['user_id' => $this->asisten->id, 'semester_id' => $this->semester->id, 'date' => '2026-10-02', 'start_time' => '07:20', 'end_time' => '09:50', 'status' => 'verified']);
        $report->assistants()->sync([$this->asisten->id => ['position' => 1], $partner->id => ['position' => 2]]);
        SupervisionReport::factory()->create(['user_id' => $this->asisten->id, 'semester_id' => $this->semester->id, 'date' => '2026-10-03', 'status' => 'submitted'])
            ->assistants()->sync([$this->asisten->id => ['position' => 1]]);

        $recaps = app(ComputeHonorRecaps::class)('2026-10');

        $this->assertCount(2, $recaps);
        $mine = $recaps->firstWhere('user_id', $this->asisten->id);
        $this->assertSame(2.5, (float) $mine->total_hours);
        $this->assertSame(62500, $mine->amount);

        // Bendahara menyetujui → Final; asisten biasa tidak boleh.
        $this->actingAs($this->asisten)->post(route('asisten.honor-recaps.approve'), ['month' => '2026-10'])->assertForbidden();
        $this->actingAs(User::factory()->asisten(Position::Bendahara)->create())->post(route('asisten.honor-recaps.approve'), ['month' => '2026-10'])->assertSessionHasNoErrors();
        $this->assertSame(2, HonorRecap::where('status', 'final')->count());
    }

    public function test_generate_queues_an_export_and_builds_a_zip_of_daily_pdfs()
    {
        foreach (['2026-10-01', '2026-10-02'] as $date) {
            SupervisionReport::factory()->create(['user_id' => $this->asisten->id, 'semester_id' => $this->semester->id, 'date' => $date, 'status' => 'verified'])
                ->assistants()->sync([$this->asisten->id => ['position' => 1]]);
        }

        Queue::fake();
        $this->actingAs($this->asisten)->post(route('asisten.exports.store'), ['month' => '2026-10', 'format' => 'zip', 'scope' => 'mine'])->assertSessionHasNoErrors();
        Queue::assertPushed(GenerateMonthlyReport::class);

        $export = Export::sole();
        app()->call([new GenerateMonthlyReport($export), 'handle']);
        $export->refresh();

        $this->assertSame('done', $export->status);
        $this->assertTrue($export->expires_at->isTomorrow());
        $zip = new ZipArchive;
        $zip->open(Storage::disk('lab')->path($export->file->path));
        $this->assertSame(2, $zip->numFiles);
        $this->assertStringStartsWith('%PDF', $zip->getFromIndex(0));
    }

    public function test_months_without_verified_reports_produce_a_message_not_an_empty_file()
    {
        $export = Export::create(['user_id' => $this->asisten->id, 'type' => 'excel', 'params_json' => ['month' => '2026-08', 'scope' => 'mine']]);
        app()->call([new GenerateMonthlyReport($export), 'handle']);

        $this->assertSame('empty', $export->fresh()->status);
        $this->assertSame('Tidak ada laporan pada periode ini.', $export->fresh()->error);
        $this->assertNull($export->fresh()->file_id);
    }

    public function test_only_treasurers_can_export_all_assistants()
    {
        $this->actingAs($this->asisten)->post(route('asisten.exports.store'), ['month' => '2026-10', 'format' => 'excel', 'scope' => 'all'])->assertForbidden();
    }
}
