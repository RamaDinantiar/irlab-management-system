<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\Honor\ComputeHonorRecaps;
use App\Http\Controllers\Controller;
use App\Jobs\GenerateMonthlyReport;
use App\Models\Export;
use App\Models\HonorRecap;
use App\Models\Shift;
use App\Models\SupervisionReport;
use App\Support\Reports\DailyActivityReport;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Asisten › Generate — rekap laporan mengawas dalam Word (ZIP per hari / satu hari) & Excel (US-A04, FR-AGN-01…04) + honor.
 */
class GenerateController extends Controller
{
    public function index(Request $request, ComputeHonorRecaps $recaps): Response
    {
        $user = $request->user();
        $month = preg_match('/^\d{4}-\d{2}$/', (string) $request->query('month')) ? $request->query('month') : now()->format('Y-m');
        $start = CarbonImmutable::createFromFormat('Y-m', $month)->startOfMonth();
        $allScope = $user->canApproveHonor();
        $scope = $allScope && $request->query('scope') === 'all' ? 'all' : 'mine';

        $inMonth = fn ($q) => $q->whereDateBetween('date', [$start->toDateString(), $start->endOfMonth()->toDateString()]);
        $mine = fn ($q) => $q->where(fn ($w) => $w->where('user_id', $user->id)->orWhereHas('assistants', fn ($a) => $a->whereKey($user->id)));

        $all = SupervisionReport::query()->tap($inMonth)->when($scope === 'mine', $mine)->get(['id', 'date', 'status']);
        $verified = GenerateMonthlyReport::reports($user->id, $month, $scope);

        return Inertia::render('asisten/generate', [
            'filters' => ['month' => $month, 'scope' => $scope],
            'canAllScope' => $allScope,
            'stats' => [
                'activeDays' => $verified->pluck('date')->map->toDateString()->unique()->count(),
                'scheduledShifts' => Shift::query()->tap($inMonth)->when($scope === 'mine', fn ($q) => $q->where('user_id', $user->id))->count(),
                'verified' => $verified->count(),
                'total' => $all->count(),
            ],
            'files' => $verified->groupBy(fn (SupervisionReport $r) => $r->date->toDateString())->map(fn ($items, $date) => [
                'date' => $date,
                'shifts' => $items->count(),
                'courses' => $items->map(fn (SupervisionReport $r) => $r->labClass ? "{$r->labClass->course->name} ({$r->labClass->name})" : $r->activity)->unique()->values(),
                'assistants' => $items->flatMap(fn (SupervisionReport $r) => $r->assistants->pluck('name'))->unique()->values(),
                'materials' => $items->pluck('material')->filter()->unique()->values(),
            ])->values(),
            'exports' => Export::where('user_id', $user->id)->with('file')->latest()->limit(10)->get()->map(fn (Export $e) => $this->exportRow($e)),
            'honor' => $allScope ? [
                'recaps' => $recaps($month)->map(fn (HonorRecap $r) => [
                    'id' => $r->id,
                    'name' => $r->user->name,
                    'nim' => $r->user->nim,
                    'shifts' => $r->total_shifts,
                    'hours' => (float) $r->total_hours,
                    'rate' => $r->rate_per_hour,
                    'amount' => $r->amount,
                    'status' => $r->status,
                ])->values(),
                'canApprove' => true,
            ] : [
                'recaps' => HonorRecap::where('month', $month)->where('user_id', $user->id)->get()->map(fn (HonorRecap $r) => [
                    'id' => $r->id, 'name' => $user->name, 'nim' => $user->nim, 'shifts' => $r->total_shifts,
                    'hours' => (float) $r->total_hours, 'rate' => $r->rate_per_hour, 'amount' => $r->amount, 'status' => $r->status,
                ])->values(),
                'canApprove' => false,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'month' => ['required', 'date_format:Y-m'],
            // Single DOC tidak lewat antrean — lihat daily().
            'format' => ['required', Rule::in(['zip', 'excel'])],
            'scope' => ['required', Rule::in(['mine', 'all'])],
        ]);

        abort_if($validated['scope'] === 'all' && ! $request->user()->canApproveHonor(), 403);

        $export = Export::create([
            'user_id' => $request->user()->id,
            'type' => $validated['format'],
            'params_json' => ['month' => $validated['month'], 'scope' => $validated['scope']],
        ]);

        GenerateMonthlyReport::dispatch($export);
        Inertia::flash('toast', ['type' => 'info', 'message' => 'Rekap sedang diproses di background. Anda akan mendapat notifikasi saat selesai.']);

        return back();
    }

    /**
     * Single DOC: laporan kegiatan harian satu tanggal, langsung diunduh.
     * Satu hari cukup ringan (< 1 detik) sehingga tidak perlu menunggu antrean.
     */
    public function daily(Request $request): BinaryFileResponse|RedirectResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'scope' => ['nullable', Rule::in(['mine', 'all'])],
        ], [], ['date' => 'tanggal']);
        $scope = $validated['scope'] ?? 'mine';

        abort_if($scope === 'all' && ! $request->user()->canApproveHonor(), 403);

        $date = CarbonImmutable::parse($validated['date']);
        $reports = GenerateMonthlyReport::reports($request->user()->id, $date->format('Y-m'), $scope, $date->toDateString());

        if ($reports->isEmpty()) {
            Inertia::flash('toast', ['type' => 'warning', 'message' => 'Tidak ada laporan terverifikasi pada tanggal ini.']);

            return back();
        }

        $tmp = tempnam(sys_get_temp_dir(), 'harian');
        DailyActivityReport::save($date, $reports, $tmp);

        return response()->download($tmp, GenerateMonthlyReport::dailyName($date), [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ])->deleteFileAfterSend();
    }

    /**
     * Polling progres ekspor (US-A04-1).
     */
    public function show(Request $request, Export $export): JsonResponse
    {
        abort_unless($export->user_id === $request->user()->id, 403);

        return response()->json($this->exportRow($export->load('file')));
    }

    public function approveHonor(Request $request, ComputeHonorRecaps $recaps): RedirectResponse
    {
        $validated = $request->validate(['month' => ['required', 'date_format:Y-m']]);
        $count = $recaps->approve($request->user(), $validated['month']);
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$count} rekap honor disetujui dan berstatus Final."]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function exportRow(Export $export): array
    {
        $available = $export->status === 'done' && $export->file && $export->expires_at?->isFuture();

        return [
            'id' => $export->id,
            'type' => $export->type,
            'month' => $export->params_json['month'],
            'date' => $export->params_json['date'] ?? null, // Single DOC lama (sebelum unduh langsung)
            'scope' => $export->params_json['scope'] ?? 'mine',
            'status' => $export->status,
            'progress' => $export->progress,
            'error' => $export->error,
            'createdAt' => $export->created_at->toIso8601String(),
            'expiresAt' => $export->expires_at?->toIso8601String(),
            'file' => $available ? ['name' => $export->file->original_name, 'size' => $export->file->size, 'url' => $export->file->url()] : null,
        ];
    }
}
