<?php

namespace App\Actions\LabClass;

use App\Enums\ApprovalStatus;
use App\Models\AuditLog;
use App\Models\LabClass;
use App\Support\JoinToken;
use App\Support\Notifications\Notify;
use Illuminate\Validation\ValidationException;

/**
 * US-A01-1: Admin menyetujui kelas yang diajukan Asisten → token dibuat;
 * atau menolak dengan alasan → Asisten dapat merevisi & mengajukan ulang.
 */
class ReviewClass
{
    public function approve(LabClass $class): void
    {
        $this->ensurePending($class);

        $class->forceFill([
            'approval_status' => ApprovalStatus::Approved,
            'approved_by' => auth()->id(),
            'approved_at' => now(),
            'rejection_reason' => null,
            'join_token' => JoinToken::generate($class->semester_id),
        ])->save();

        AuditLog::record('class.approved', $class, ['approval_status' => 'pending'], ['approval_status' => 'approved']);
        $class->loadMissing('course');
        Notify::send($class->proposed_by ? [$class->proposed_by] : [], 'approval', 'Kelas disetujui', "{$class->course->name} · {$class->name} disetujui. Token kelas: {$class->join_token}.", '/asisten/class/'.$class->id.'/settings');
    }

    public function reject(LabClass $class, string $reason): void
    {
        $this->ensurePending($class);

        $class->forceFill(['approval_status' => ApprovalStatus::Rejected, 'rejection_reason' => $reason])->save();

        AuditLog::record('class.rejected', $class, ['approval_status' => 'pending'], [
            'approval_status' => 'rejected',
            'rejection_reason' => $reason,
        ]);
        $class->loadMissing('course');
        Notify::send($class->proposed_by ? [$class->proposed_by] : [], 'approval', 'Pengajuan kelas ditolak', "{$class->course->name} · {$class->name}: {$reason}", '/asisten/class');
    }

    private function ensurePending(LabClass $class): void
    {
        if ($class->approval_status !== ApprovalStatus::Pending) {
            throw ValidationException::withMessages(['class' => 'Pengajuan ini sudah ditinjau.']);
        }
    }
}
