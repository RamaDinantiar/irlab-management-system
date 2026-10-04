<?php

namespace App\Actions\Course;

use App\Enums\ApprovalStatus;
use App\Models\AuditLog;
use App\Models\Course;
use Illuminate\Validation\ValidationException;

/**
 * Admin menyetujui atau menolak Mata Kuliah yang diajukan Asisten (FR-ADM-03).
 * Penolakan wajib disertai alasan; Asisten dapat merevisi lalu mengajukan ulang.
 */
class ReviewCourse
{
    public function approve(Course $course): void
    {
        $this->ensurePending($course);

        $course->forceFill([
            'approval_status' => ApprovalStatus::Approved,
            'approved_by' => auth()->id(),
            'approved_at' => now(),
            'rejection_reason' => null,
        ])->save();

        AuditLog::record('course.approved', $course, ['approval_status' => 'pending'], ['approval_status' => 'approved']);
    }

    public function reject(Course $course, string $reason): void
    {
        $this->ensurePending($course);

        $course->forceFill([
            'approval_status' => ApprovalStatus::Rejected,
            'rejection_reason' => $reason,
        ])->save();

        AuditLog::record('course.rejected', $course, ['approval_status' => 'pending'], [
            'approval_status' => 'rejected',
            'rejection_reason' => $reason,
        ]);
    }

    private function ensurePending(Course $course): void
    {
        if ($course->approval_status !== ApprovalStatus::Pending) {
            throw ValidationException::withMessages([
                'course' => 'Pengajuan ini sudah ditinjau.',
            ]);
        }
    }
}
