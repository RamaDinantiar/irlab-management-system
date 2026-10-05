<?php

namespace App\Http\Controllers\Asisten;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Asisten\ClassProposalRequest;
use App\Models\AuditLog;
use App\Models\LabClass;
use App\Models\Semester;
use App\Support\Notifications\Notify;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * US-A01-1 & FR-AS-02: Asisten mengajukan kelas (Menunggu Persetujuan; token
 * dibuat setelah disetujui) dan mengubah jadwal kelasnya. Perubahan jadwal
 * kelas yang sudah aktif tidak memerlukan persetujuan ulang.
 */
class ClassProposalController extends Controller
{
    public function store(ClassProposalRequest $request): RedirectResponse
    {
        $class = new LabClass($request->safe()->except('confirm_conflicts'));
        $class->semester()->associate(Semester::current());
        $class->forceFill([
            'approval_status' => ApprovalStatus::Pending,
            'proposed_by' => $request->user()->id,
        ])->save();
        $class->assistants()->attach($request->user());

        AuditLog::record('class.proposed', $class, null, $request->validated());
        Notify::admins('approval', 'Pengajuan kelas baru', "{$request->user()->name} mengajukan {$class->course->name} · {$class->name}.", '/admin/classes?status=pending');
        Inertia::flash('toast', ['type' => 'success', 'message' => "Pengajuan {$class->name} dikirim. Token dibuat setelah Admin menyetujui."]);

        return to_route('asisten.class.index');
    }

    public function update(ClassProposalRequest $request, LabClass $class): RedirectResponse
    {
        $before = $class->only(['course_id', 'name', 'day_of_week', 'start_time', 'end_time', 'room_id', 'quota', 'approval_status']);
        $class->fill($request->safe()->except('confirm_conflicts'));

        // Pengajuan yang ditolak dikirim ulang; kelas aktif cukup diperbarui.
        if ($class->approval_status === ApprovalStatus::Rejected) {
            $class->forceFill(['approval_status' => ApprovalStatus::Pending, 'rejection_reason' => null]);
        }

        $class->save();

        if ($class->wasChanged('approval_status')) {
            Notify::admins('approval', 'Revisi pengajuan kelas', "{$request->user()->name} mengirim ulang {$class->course->name} · {$class->name}.", '/admin/classes?status=pending');
        }

        AuditLog::record('class.updated', $class, $before, $request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => $class->approval_status === ApprovalStatus::Pending
            ? "Revisi {$class->name} dikirim ke Admin."
            : "Jadwal {$class->name} diperbarui."]);

        return to_route('asisten.class.index');
    }
}
