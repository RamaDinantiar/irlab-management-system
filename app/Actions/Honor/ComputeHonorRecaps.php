<?php

namespace App\Actions\Honor;

use App\Models\AuditLog;
use App\Models\HonorRate;
use App\Models\HonorRecap;
use App\Models\SupervisionReport;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * FR-AGN-03: jam dari laporan Diverifikasi (setiap anggota tim mendapat jam
 * laporan tsb) × tarif per jam yang berlaku. Rekap Final tidak dihitung ulang.
 */
class ComputeHonorRecaps
{
    /**
     * @return Collection<int, HonorRecap>
     */
    public function __invoke(string $month): Collection
    {
        $start = CarbonImmutable::createFromFormat('Y-m', $month)->startOfMonth();
        $rate = HonorRate::rateOn($start->endOfMonth()->toDateString());

        $reports = SupervisionReport::where('status', 'verified')
            ->whereDateBetween('date', [$start->toDateString(), $start->endOfMonth()->toDateString()])
            ->with('assistants:id')->get();

        $perUser = [];
        foreach ($reports as $report) {
            foreach ($report->assistants as $assistant) {
                $perUser[$assistant->id]['shifts'] = ($perUser[$assistant->id]['shifts'] ?? 0) + 1;
                $perUser[$assistant->id]['hours'] = ($perUser[$assistant->id]['hours'] ?? 0) + $report->hours();
            }
        }

        return DB::transaction(function () use ($month, $perUser, $rate) {
            $final = HonorRecap::where('month', $month)->where('status', 'final')->pluck('user_id')->all();
            HonorRecap::where('month', $month)->where('status', 'draft')->whereNotIn('user_id', array_keys($perUser))->delete();

            foreach ($perUser as $userId => $totals) {
                if (in_array($userId, $final, true)) {
                    continue;
                }

                HonorRecap::updateOrCreate(['month' => $month, 'user_id' => $userId], [
                    'total_shifts' => $totals['shifts'],
                    'total_hours' => round($totals['hours'], 2),
                    'rate_per_hour' => $rate,
                    'amount' => (int) round($totals['hours'] * $rate),
                    'status' => 'draft',
                ]);
            }

            return HonorRecap::where('month', $month)->with('user:id,name,nim')->orderBy('user_id')->get();
        });
    }

    /**
     * Bendahara menyetujui seluruh rekap Draft satu bulan → Final.
     */
    public function approve(User $approver, string $month): int
    {
        abort_unless($approver->canApproveHonor(), 403);

        $this($month);
        $count = HonorRecap::where('month', $month)->where('status', 'draft')
            ->update(['status' => 'final', 'approved_by' => $approver->id, 'approved_at' => now()]);

        if ($count === 0) {
            throw ValidationException::withMessages(['month' => 'Tidak ada rekap Draft pada bulan ini.']);
        }

        AuditLog::record('honor.approved', $approver, null, ['month' => $month, 'count' => $count]);

        return $count;
    }
}
