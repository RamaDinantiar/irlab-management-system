<?php

namespace App\Actions\LabClass;

use App\Enums\ApprovalStatus;
use App\Models\AuditLog;
use App\Models\LabClass;
use App\Support\JoinToken;
use Illuminate\Validation\ValidationException;

/**
 * US-A01-3/4: regenerate token (token lama langsung tidak berlaku) dan
 * Lock Class (praktikan baru tidak dapat bergabung; anggota lama tetap).
 */
class ManageClassAccess
{
    public function regenerateToken(LabClass $class): string
    {
        $this->ensureApproved($class);

        $class->forceFill(['join_token' => JoinToken::generate($class->semester_id)])->save();
        // Nilai token sengaja tidak dicatat: audit log tidak boleh membocorkan token aktif.
        AuditLog::record('class.token_regenerated', $class);

        return $class->join_token;
    }

    public function setLocked(LabClass $class, bool $locked): void
    {
        $this->ensureApproved($class);

        $class->forceFill(['is_locked' => $locked])->save();
        AuditLog::record($locked ? 'class.locked' : 'class.unlocked', $class);
    }

    private function ensureApproved(LabClass $class): void
    {
        if ($class->approval_status !== ApprovalStatus::Approved) {
            throw ValidationException::withMessages(['class' => 'Kelas belum disetujui Admin.']);
        }
    }
}
