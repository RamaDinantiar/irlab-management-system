<?php

namespace App\Http\Controllers\Asisten;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Asisten\ProposeCourseRequest;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Semester;
use App\Support\Notifications\Notify;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;

/**
 * FR-AS-02: Asisten mengajukan Mata Kuliah baru (perlu persetujuan Admin) dan
 * merevisi pengajuan yang ditolak. Pengaju otomatis menjadi asisten pengampu.
 */
class CourseProposalController extends Controller
{
    public function store(ProposeCourseRequest $request): RedirectResponse
    {
        $course = new Course($request->validated());
        $course->semester()->associate(Semester::current());
        $course->forceFill([
            'approval_status' => ApprovalStatus::Pending,
            'proposed_by' => $request->user()->id,
        ])->save();
        $course->assistants()->attach($request->user());

        AuditLog::record('course.proposed', $course, null, $request->validated());
        Notify::admins('approval', 'Pengajuan mata kuliah baru', "{$request->user()->name} mengajukan {$course->code} {$course->name}.", '/admin/courses?status=pending');
        Inertia::flash('toast', ['type' => 'success', 'message' => "Pengajuan {$course->name} dikirim. Menunggu persetujuan Admin."]);

        return to_route('asisten.class.index');
    }

    public function update(ProposeCourseRequest $request, Course $course): RedirectResponse
    {
        $before = $course->only(['code', 'name', 'credits', 'weight_pretest', 'weight_posttest', 'weight_report', 'approval_status', 'rejection_reason']);

        $course->fill($request->validated());
        $course->forceFill(['approval_status' => ApprovalStatus::Pending, 'rejection_reason' => null])->save();

        AuditLog::record('course.resubmitted', $course, $before, $request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => "Revisi {$course->name} dikirim ulang ke Admin."]);

        return to_route('asisten.class.index');
    }
}
