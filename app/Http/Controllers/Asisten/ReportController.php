<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\Report\ReviewSupervisionReport;
use App\Actions\Report\SaveSupervisionReport;
use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Semester;
use App\Models\Shift;
use App\Models\SupervisionReport;
use App\Models\User;
use App\Support\Report\ReportSearchText;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Asisten › Report — Laporan Ngawas (US-A03, FR-AR-01…05).
 */
class ReportController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        // Filter tanggal (opsional) mengikat bulannya sendiri.
        $date = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $request->query('date')) && strtotime((string) $request->query('date'))
            ? CarbonImmutable::parse($request->query('date'))->toDateString() : null;
        $month = $date ? substr($date, 0, 7)
            : (preg_match('/^\d{4}-\d{2}$/', (string) $request->query('month')) ? $request->query('month') : now()->format('Y-m'));
        $start = CarbonImmutable::createFromFormat('Y-m', $month)->startOfMonth();
        $reviewer = $user->canVerifyReports();
        $tab = in_array($request->query('tab'), ['verify', 'all'], true) && $reviewer ? $request->query('tab') : 'mine';
        $search = trim((string) $request->query('q'));

        $period = fn ($q) => $date
            ? $q->whereDate('date', $date)
            : $q->whereDateBetween('date', [$start->toDateString(), $start->endOfMonth()->toDateString()]);

        $scoped = fn () => SupervisionReport::query()
            ->when($tab === 'mine', fn ($q) => $q->where(fn ($w) => $w->where('user_id', $user->id)->orWhereHas('assistants', fn ($a) => $a->whereKey($user->id))))
            ->when($tab === 'verify', fn ($q) => $q->where('status', 'submitted'));

        $reports = $scoped()
            ->when($tab !== 'verify' && $date, fn ($q) => $q->whereDate('date', $date))
            ->when($tab !== 'verify' && ! $date, fn ($q) => $q->whereDateBetween('date', [$start->toDateString(), $start->endOfMonth()->toDateString()]))
            ->with(['labClass.course', 'room', 'assistants:id,name', 'user:id,name', 'verifier:id,name', 'photos'])
            ->orderByDesc('date')->orderBy('start_time')
            ->get();

        $days = $reports->groupBy(fn (SupervisionReport $r) => $r->date->toDateString())->map(function ($items, $date) use ($user) {
            $slots = $items->pluck('start_time')->unique()->sort()->values();

            return [
                'date' => $date,
                'reports' => $items->map(fn (SupervisionReport $r) => [
                    'id' => $r->id,
                    'shiftNumber' => $slots->search($r->start_time) + 1,
                    'shiftId' => $r->shift_id,
                    'date' => $date,
                    'start' => substr($r->start_time, 0, 5),
                    'end' => substr($r->end_time, 0, 5),
                    'classId' => $r->class_id,
                    'code' => $r->labClass?->course->code,
                    'course' => $r->labClass?->course->name,
                    'className' => $r->labClass?->name,
                    'room' => $r->room?->name,
                    'activity' => $r->activity,
                    'material' => $r->material,
                    'notes' => $r->notes,
                    'assistants' => $r->assistants->map(fn (User $a) => ['id' => $a->id, 'name' => $a->name, 'lead' => $a->pivot->position === 1])->values(),
                    'author' => $r->user->name,
                    'status' => $r->status,
                    'returnNote' => $r->return_note,
                    'verifier' => $r->verifier?->name,
                    'photo' => ($photo = $r->photos->first()) ? ['name' => $photo->original_name, 'url' => $photo->url(inline: true)] : null,
                    'locked' => $r->isLocked(),
                    'editableUntil' => $r->editable_until->toIso8601String(),
                    'canEdit' => $r->isEditableBy($user),
                    'canReview' => $user->canVerifyReports() && $r->status === 'submitted' && ($r->user_id !== $user->id || $user->isAdmin()),
                    'canUnlock' => $user->isAdmin() && $r->isLocked(),
                ])->values(),
            ];
        })->values();

        // Cari di semua isi laporan + hari/tanggal (mis. "kamis", "1 oktober", "01/10/2026").
        if ($search !== '') {
            $terms = preg_split('/\s+/', mb_strtolower($search)) ?: [];
            $days = $days->map(fn ($day) => [
                ...$day,
                'reports' => $day['reports']->filter(function (array $row) use ($terms) {
                    $haystack = ReportSearchText::for($row);

                    return collect($terms)->every(fn ($term) => str_contains($haystack, $term));
                })->values(),
            ])->filter(fn ($day) => $day['reports']->isNotEmpty())->values();
        }

        $semester = Semester::current();

        return Inertia::render('asisten/report', [
            'filters' => ['month' => $month, 'date' => $date, 'q' => $search, 'tab' => $tab],
            // Titik penanda di kalender filter.
            'reportDates' => $tab === 'verify' ? [] : $scoped()
                ->whereDateBetween('date', [$start->toDateString(), $start->endOfMonth()->toDateString()])
                ->pluck('date')->map(fn ($d) => CarbonImmutable::parse($d)->toDateString())->unique()->sort()->values(),
            'days' => $days,
            'isReviewer' => $reviewer,
            // Jumlah per tab pada periode terpilih (tanpa kata kunci).
            'tabCounts' => $reviewer ? [
                'mine' => $period(SupervisionReport::where(fn ($w) => $w->where('user_id', $user->id)->orWhereHas('assistants', fn ($a) => $a->whereKey($user->id))))->count(),
                'verify' => SupervisionReport::where('status', 'submitted')->count(),
                'all' => $period(SupervisionReport::query())->count(),
            ] : null,
            // US-A03-1: auto-fill dari jadwal hari ini (dan shift kemarin yang belum dilaporkan).
            'pendingShifts' => Shift::where('user_id', $user->id)
                ->whereDateBetween('date', [today()->subDay()->toDateString(), today()->toDateString()])
                ->unreported()
                ->with(['labClass.course', 'labClass.assistants:id', 'room'])->orderByDesc('date')->orderBy('start_time')->get()
                ->map(fn (Shift $s) => [
                    'id' => $s->id,
                    'date' => $s->date->toDateString(),
                    'start' => $s->startClock(),
                    'end' => $s->endClock(),
                    'classId' => $s->class_id,
                    'title' => $s->displayTitle(),
                    'code' => $s->labClass?->course->code,
                    'room' => $s->room?->name,
                    'teamIds' => collect([$user->id])->concat($s->labClass?->assistants->pluck('id') ?? [])->unique()->take(4)->values(),
                ])->values(),
            // Materi pertemuan per "kelas|tanggal" → mengisi otomatis kolom Materi laporan.
            'meetingMaterials' => $semester
                ? Meeting::whereIn('class_id', LabClass::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)->select('id'))
                    ->whereNotNull('topic')->get(['class_id', 'date', 'number', 'topic'])
                    ->mapWithKeys(fn (Meeting $m) => ["{$m->class_id}|{$m->date->toDateString()}" => ['number' => $m->number, 'material' => $m->topic]])
                : (object) [],
            'classOptions' => $semester
                ? LabClass::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)->with('course')->orderBy('course_id')->orderBy('name')->get()
                    ->map(fn (LabClass $c) => ['id' => $c->id, 'course' => $c->course->name, 'code' => $c->course->code, 'name' => $c->name])->values()
                : [],
            'assistantOptions' => User::where('role', 'asisten')->where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function store(Request $request, SaveSupervisionReport $save): RedirectResponse
    {
        $report = $save($request->user(), $this->validated($request), $request->file('photo'));
        $this->toast($report);

        return to_route('asisten.reports.index', ['month' => $report->date->format('Y-m')]);
    }

    public function update(Request $request, SupervisionReport $report, SaveSupervisionReport $save): RedirectResponse
    {
        $save($request->user(), $this->validated($request), $request->file('photo'), $report);
        $this->toast($report->fresh());

        return back();
    }

    public function destroy(Request $request, SupervisionReport $report): RedirectResponse
    {
        abort_unless($report->user_id === $request->user()->id && $report->status === 'draft', 403);

        AuditLog::record('report.deleted', $report, $report->only(['date', 'status']));
        $report->photos()->get()->each->delete();
        $report->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Draft laporan dihapus.']);

        return back();
    }

    public function verify(Request $request, SupervisionReport $report, ReviewSupervisionReport $review): RedirectResponse
    {
        $review->verify($request->user(), $report);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Laporan diverifikasi dan masuk rekap.']);

        return back();
    }

    public function return(Request $request, SupervisionReport $report, ReviewSupervisionReport $review): RedirectResponse
    {
        $validated = $request->validate(['note' => ['required', 'string', 'min:5', 'max:500']], [], ['note' => 'catatan']);
        $review->return($request->user(), $report, $validated['note']);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Laporan dikembalikan ke pembuat dengan catatan.']);

        return back();
    }

    public function unlock(Request $request, SupervisionReport $report, ReviewSupervisionReport $review): RedirectResponse
    {
        $review->unlock($request->user(), $report);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Kunci laporan dibuka hingga besok 23.59.']);

        return back();
    }

    /**
     * @return array{shift_id: int|null, date: string, start_time: string, end_time: string, class_id: int, activity: string, material: string, notes: string, assistant_ids: list<int>, submit: bool}
     */
    private function validated(Request $request): array
    {
        // Foto wajib; saat mengubah laporan yang sudah berfoto boleh tidak diganti.
        $report = $request->route('report');
        $hasPhoto = $report instanceof SupervisionReport && $report->photos()->exists();

        $validated = $request->validate([
            'shift_id' => ['nullable', 'integer', 'exists:shifts,id'],
            'date' => ['required', 'date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'class_id' => ['required', 'integer', 'exists:classes,id'],
            'activity' => ['required', 'string', 'max:150'],
            'material' => ['required', 'string', 'max:150'],
            'notes' => ['required', 'string', 'min:10', 'max:3000'],
            'assistant_ids' => ['required', 'array', 'min:1', 'max:4'],
            'assistant_ids.*' => ['integer', Rule::exists('users', 'id')->where('role', 'asisten')],
            'photo' => [$hasPhoto ? 'nullable' : 'required', 'file'],
            'submit' => ['boolean'],
        ], [], [
            'start_time' => 'jam mulai', 'end_time' => 'jam selesai', 'class_id' => 'kelas', 'activity' => 'kelas/kegiatan',
            'material' => 'materi', 'notes' => 'deskripsi kegiatan', 'assistant_ids' => 'tim asisten jaga', 'photo' => 'foto dokumentasi',
        ]);

        if ($request->hasFile('photo') && $request->file('photo')->getSize() > 5 * 1024 * 1024) {
            throw ValidationException::withMessages(['photo' => 'Foto maksimal 5 MB.']);
        }

        return [
            'shift_id' => $request->filled('shift_id') ? $request->integer('shift_id') : null,
            'date' => $request->string('date')->toString(),
            'start_time' => $request->string('start_time')->toString(),
            'end_time' => $request->string('end_time')->toString(),
            'class_id' => $request->integer('class_id'),
            'activity' => $request->string('activity')->toString(),
            'material' => $request->string('material')->toString(),
            'notes' => $request->string('notes')->toString(),
            'assistant_ids' => array_values(array_map('intval', (array) $validated['assistant_ids'])),
            'submit' => $request->boolean('submit'),
        ];
    }

    private function toast(SupervisionReport $report): void
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $report->status === 'submitted'
            ? 'Laporan dikirim ke Sekretaris/Bendahara untuk diverifikasi.'
            : 'Laporan disimpan sebagai Draft.']);
    }
}
