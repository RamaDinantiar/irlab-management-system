<?php

namespace App\Actions\Report;

use App\Events\SupervisionReportReviewed;
use App\Models\AuditLog;
use App\Models\SupervisionReport;
use App\Models\User;
use Illuminate\Validation\ValidationException;

/**
 * FR-AR-05: Sekretaris/Bendahara memverifikasi atau mengembalikan (dengan catatan)
 * laporan berstatus Diajukan. FR-AR-04: Admin membuka kunci laporan.
 */
class ReviewSupervisionReport
{
    public function verify(User $reviewer, SupervisionReport $report): void
    {
        $this->guard($reviewer, $report);

        $report->forceFill(['status' => 'verified', 'verified_by' => $reviewer->id, 'verified_at' => now(), 'return_note' => null])->save();
        AuditLog::record('report.verified', $report, ['status' => 'submitted'], ['status' => 'verified']);
        SupervisionReportReviewed::dispatch($report);
    }

    public function return(User $reviewer, SupervisionReport $report, string $note): void
    {
        $this->guard($reviewer, $report);

        // Pembuat diberi waktu memperbaiki hingga besok 23.59 walau sudah lewat H+1.
        $until = now()->addDay()->endOfDay();
        $report->forceFill([
            'status' => 'returned',
            'return_note' => $note,
            'verified_by' => $reviewer->id,
            'verified_at' => now(),
            'editable_until' => $report->editable_until->max($until),
        ])->save();

        AuditLog::record('report.returned', $report, ['status' => 'submitted'], ['status' => 'returned', 'note' => $note]);
        SupervisionReportReviewed::dispatch($report);
    }

    public function unlock(User $admin, SupervisionReport $report): void
    {
        abort_unless($admin->isAdmin(), 403);

        $before = ['editable_until' => $report->editable_until->toIso8601String()];
        $report->forceFill(['editable_until' => now()->addDay()->endOfDay()])->save();
        AuditLog::record('report.unlocked', $report, $before, ['editable_until' => $report->editable_until->toIso8601String()]);
    }

    private function guard(User $reviewer, SupervisionReport $report): void
    {
        abort_unless($reviewer->canVerifyReports(), 403);

        if ($report->status !== 'submitted') {
            throw ValidationException::withMessages(['report' => 'Hanya laporan berstatus Diajukan yang dapat diverifikasi.']);
        }

        if ($report->user_id === $reviewer->id && ! $reviewer->isAdmin()) {
            throw ValidationException::withMessages(['report' => 'Laporan sendiri diverifikasi oleh Sekretaris/Bendahara lain atau Admin.']);
        }
    }
}
