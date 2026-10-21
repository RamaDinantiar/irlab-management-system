<?php

namespace Tests\Feature\Asisten;

use App\Actions\Honor\ComputeHonorRecaps;
use App\Actions\Shift\SwapShift;
use App\Enums\Position;
use App\Jobs\GenerateMonthlyReport;
use App\Models\Export;
use App\Models\HonorRate;
use App\Models\HonorRecap;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Room;
use App\Models\Semester;
use App\Models\Shift;
use App\Models\ShiftSwap;
use App\Models\SupervisionReport;
use App\Models\User;
use App\Support\Files\FileStore;
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

    private LabClass $class;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('lab');
        $this->travelTo(CarbonImmutable::parse('2026-10-05 10:00'));

        $this->semester = Semester::factory()->active()->create(['start_date' => '2026-09-01', 'end_date' => '2027-01-31']);
        $this->room = Room::factory()->create();
        $this->class = LabClass::factory()->create(['semester_id' => $this->semester->id, 'room_id' => $this->room->id]);
        $this->asisten = User::factory()->asisten()->create();
        $this->sekretaris = User::factory()->asisten(Position::SekretarisBendahara)->create();
    }

    private function shift(User $user, string $date, string $start = '13:00', string $end = '16:00'): Shift
    {
        return Shift::create(['semester_id' => $this->semester->id, 'user_id' => $user->id, 'room_id' => $this->room->id, 'title' => 'Jaga Lab', 'date' => $date, 'start_time' => $start, 'end_time' => $end]);
    }

    private function payload(array $overrides = []): array
    {
        return [
            'date' => '2026-10-05', 'start_time' => '07:20', 'end_time' => '09:50',
            'class_id' => $this->class->id, 'activity' => 'Jaga Lab', 'material' => 'OLAP',
            'notes' => 'Praktikum berjalan lancar tanpa kendala.', 'assistant_ids' => [$this->asisten->id],
            'photo' => UploadedFile::fake()->image('dokumentasi.jpg'),
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

    public function test_class_material_team_and_photo_are_required()
    {
        $this->actingAs($this->asisten);

        $this->post(route('asisten.reports.store'), $this->payload(['class_id' => null, 'material' => '', 'assistant_ids' => [], 'photo' => null]))
            ->assertSessionHasErrors(['class_id', 'material', 'assistant_ids', 'photo']);

        // Laporan yang sudah berfoto boleh diubah tanpa mengunggah ulang.
        $this->post(route('asisten.reports.store'), $this->payload())->assertSessionHasNoErrors();
        $this->post(route('asisten.reports.update', SupervisionReport::sole()), $this->payload(['photo' => null, 'notes' => 'Catatan diperbarui tanpa foto baru.']))
            ->assertSessionHasNoErrors();
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

        $this->actingAs($this->asisten)->post(route('asisten.reports.update', $report), $this->payload(['submit' => true, 'material' => 'OLAP lanjutan']));
        $this->actingAs($this->sekretaris)->post(route('asisten.reports.verify', $report))->assertSessionHasNoErrors();
        $this->assertSame('verified', $report->fresh()->status);

        // Laporan terverifikasi tidak dapat diubah lagi.
        $this->actingAs($this->asisten)->post(route('asisten.reports.update', $report), $this->payload())->assertSessionHasErrors('report');
    }

    public function test_reports_can_be_filtered_by_date_and_searched()
    {
        $other = User::factory()->asisten()->create(['name' => 'Rama Dinantiar']);
        $base = ['semester_id' => $this->semester->id, 'status' => 'verified'];
        SupervisionReport::factory()->create([...$base, 'user_id' => $this->asisten->id, 'date' => '2026-10-02', 'activity' => 'Jaga Pagi']);
        SupervisionReport::factory()->create([...$base, 'user_id' => $this->asisten->id, 'date' => '2026-10-03', 'activity' => 'Diskon 100% Lab']);
        SupervisionReport::factory()->create([...$base, 'user_id' => $other->id, 'date' => '2026-10-03', 'activity' => 'Jaga Sore']);

        $dates = fn ($response) => collect($response->viewData('page')['props']['days'])->flatMap(fn ($d) => collect($d['reports'])->pluck('activity'))->sort()->values()->all();
        $as = $this->actingAs($this->sekretaris);

        $byDate = $as->get(route('asisten.reports.index', ['date' => '2026-10-03', 'tab' => 'all']));
        $byDate->assertInertia(fn (Assert $page) => $page->where('filters.date', '2026-10-03')->where('filters.month', '2026-10'));
        $this->assertSame(['Diskon 100% Lab', 'Jaga Sore'], $dates($byDate));

        $this->assertSame(['Jaga Sore'], $dates($as->get(route('asisten.reports.index', ['month' => '2026-10', 'tab' => 'all', 'q' => 'rama']))));
        $this->assertSame(['Diskon 100% Lab'], $dates($as->get(route('asisten.reports.index', ['month' => '2026-10', 'tab' => 'all', 'q' => '100%']))));

        // Hari & tanggal (2 Okt 2026 = Jumat, 3 Okt 2026 = Sabtu); semua kata harus cocok.
        $this->assertSame(['Diskon 100% Lab', 'Jaga Sore'], $dates($as->get(route('asisten.reports.index', ['month' => '2026-10', 'tab' => 'all', 'q' => 'Sabtu']))));
        $this->assertSame(['Jaga Pagi'], $dates($as->get(route('asisten.reports.index', ['month' => '2026-10', 'tab' => 'all', 'q' => 'jumat jaga']))));
        $this->assertSame(['Jaga Pagi'], $dates($as->get(route('asisten.reports.index', ['month' => '2026-10', 'tab' => 'all', 'q' => '02/10/2026']))));
        $as->get(route('asisten.reports.index', ['month' => '2026-10', 'tab' => 'all']))
            ->assertInertia(fn (Assert $page) => $page->where('reportDates', ['2026-10-02', '2026-10-03']));
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

        // Sekretaris/Bendahara menyetujui → Final; asisten biasa tidak boleh.
        $this->actingAs($this->asisten)->post(route('asisten.honor-recaps.approve'), ['month' => '2026-10'])->assertForbidden();
        $this->actingAs(User::factory()->asisten(Position::SekretarisBendahara)->create())->post(route('asisten.honor-recaps.approve'), ['month' => '2026-10'])->assertSessionHasNoErrors();
        $this->assertSame(2, HonorRecap::where('status', 'final')->count());
    }

    public function test_generate_queues_an_export_and_builds_a_zip_of_daily_word_files()
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
        $this->assertSame('laporan-kegiatan-harian-Oktober-2026.zip', $export->file->original_name);

        $zip = new ZipArchive;
        $zip->open(Storage::disk('lab')->path($export->file->path));
        $this->assertSame(['Laporan Kegiatan Harian 2026-10-01 Kamis.docx', 'Laporan Kegiatan Harian 2026-10-02 Jumat.docx'], [$zip->getNameIndex(0), $zip->getNameIndex(1)]);

        $day = tempnam(sys_get_temp_dir(), 'docx');
        file_put_contents($day, $zip->getFromIndex(0));
        $xml = $this->wordXml($day);
        $this->assertStringContainsString('Kamis, 1 Oktober 2026', $xml);
        $this->assertStringNotContainsString('${', $xml);
        unlink($day);
    }

    public function test_single_doc_contains_every_session_of_one_day_only()
    {
        $class = LabClass::factory()->create(['semester_id' => $this->semester->id, 'name' => 'B', 'lecturer' => 'Dine Tiara Kusuma, ST., M.Kom']);
        $partner = User::factory()->asisten()->create(['name' => 'Suci Dwi Aprilia']);

        $morning = SupervisionReport::factory()->create([
            'user_id' => $this->asisten->id, 'semester_id' => $this->semester->id, 'class_id' => $class->id,
            'date' => '2026-10-02', 'start_time' => '10:10', 'end_time' => '11:50', 'status' => 'verified',
            'material' => 'Pengenalan Data Warehouse', 'notes' => 'Dosen menjelaskan OLAP & <ETL>.',
        ]);
        $morning->assistants()->sync([$this->asisten->id => ['position' => 1], $partner->id => ['position' => 2]]);
        app(FileStore::class)->store(UploadedFile::fake()->image('dok.png', 800, 600), ['image'], 'report_photo', $morning, $this->asisten);

        SupervisionReport::factory()->create(['user_id' => $this->asisten->id, 'semester_id' => $this->semester->id, 'date' => '2026-10-02', 'start_time' => '08:10', 'end_time' => '09:50', 'status' => 'verified', 'activity' => 'Jaga Lab Pagi'])
            ->assistants()->sync([$this->asisten->id => ['position' => 1]]);
        // Hari lain & belum diverifikasi tidak ikut.
        SupervisionReport::factory()->create(['user_id' => $this->asisten->id, 'semester_id' => $this->semester->id, 'date' => '2026-10-03', 'status' => 'verified', 'activity' => 'Hari Lain'])
            ->assistants()->sync([$this->asisten->id => ['position' => 1]]);

        // Langsung diunduh — tanpa antrean & tanpa riwayat ekspor.
        Queue::fake();
        $response = $this->actingAs($this->asisten)->get(route('asisten.generate.daily', ['date' => '2026-10-02']))
            ->assertOk()
            ->assertDownload('Laporan Kegiatan Harian 2026-10-02 Jumat.docx');
        Queue::assertNothingPushed();
        $this->assertSame(0, Export::count());

        $path = $response->baseResponse->getFile()->getPathname();
        $xml = $this->wordXml($path);
        $this->assertStringContainsString('Jumat, 2 Oktober 2026', $xml);
        $this->assertStringContainsString('Dine Tiara Kusuma, ST., M.Kom', $xml);
        $this->assertStringContainsString($class->course->code, $xml);
        $this->assertStringContainsString('Suci Dwi Aprilia', $xml);
        $this->assertStringContainsString('OLAP &amp; &lt;ETL&gt;.', $xml);
        $this->assertStringNotContainsString('Hari Lain', $xml);
        $this->assertStringNotContainsString('${', $xml);
        // Urut jam mulai: sesi 08:10 sebelum 10:10; laporan tanpa foto diberi keterangan.
        $this->assertLessThan(strpos($xml, 'Pengenalan Data Warehouse'), strpos($xml, 'Jaga Lab Pagi'));
        $this->assertStringContainsString('(Tidak ada foto dokumentasi)', $xml);
        $this->assertStringContainsString("{$class->course->name} B (10:10 – 11:50)", $xml);

        // Foto dokumentasi tertanam; 2 logo kop dari template tetap ada.
        $this->assertSame(1, substr_count($xml, '<v:imagedata'));
        $docx = new ZipArchive;
        $docx->open($path);
        $media = array_filter(array_map(fn ($i) => $docx->getNameIndex($i), range(0, $docx->numFiles - 1)), fn ($name) => str_starts_with($name, 'word/media/'));
        $this->assertCount(3, $media);
    }

    public function test_single_doc_validates_the_date_scope_and_empty_days()
    {
        $this->actingAs($this->asisten)->get(route('asisten.generate.daily'))->assertSessionHasErrors('date');
        // Cakupan semua asisten hanya untuk Sekretaris/Bendahara/Admin.
        $this->actingAs($this->asisten)->get(route('asisten.generate.daily', ['date' => '2026-10-02', 'scope' => 'all']))->assertForbidden();
        // Hari tanpa laporan terverifikasi: kembali dengan pesan, bukan file kosong.
        $this->actingAs($this->asisten)->from(route('asisten.generate.index'))->get(route('asisten.generate.daily', ['date' => '2026-10-04']))
            ->assertRedirect(route('asisten.generate.index'));
        // Format PDF sudah tidak ada; Single DOC tidak lewat antrean.
        foreach (['pdf', 'docx'] as $format) {
            $this->actingAs($this->asisten)->post(route('asisten.exports.store'), ['month' => '2026-10', 'format' => $format, 'scope' => 'mine'])
                ->assertSessionHasErrors('format');
        }
    }

    private function wordXml(string $path): string
    {
        $zip = new ZipArchive;
        $zip->open($path);
        $xml = (string) $zip->getFromName('word/document.xml');
        $zip->close();

        return $xml;
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

    public function test_the_report_form_gets_meeting_materials_for_auto_fill()
    {
        $this->class->forceFill(['approval_status' => 'approved'])->save();
        Meeting::factory()->for($this->class, 'labClass')->create(['number' => 3, 'date' => '2026-10-05', 'topic' => 'Regresi Linear']);
        Meeting::factory()->for($this->class, 'labClass')->create(['number' => 4, 'date' => '2026-10-12', 'topic' => null]);

        $this->actingAs($this->asisten)->get(route('asisten.reports.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->where("meetingMaterials.{$this->class->id}|2026-10-05", ['number' => 3, 'material' => 'Regresi Linear'])
                ->missing("meetingMaterials.{$this->class->id}|2026-10-12"));
    }
}
