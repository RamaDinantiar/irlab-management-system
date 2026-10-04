<?php

namespace App\Http\Controllers\Asisten;

use App\Http\Controllers\Controller;
use App\Http\Resources\LabClassResource;
use App\Models\AuditLog;
use App\Models\Enrollment;
use App\Models\LabClass;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Asisten › detail kelas › Anggota (FR-AC-02/03, FR-ENR-04).
 */
class MemberController extends Controller
{
    public function index(Request $request, LabClass $class): Response
    {
        $this->authorizeAssistant($request, $class);

        $class->load(['course', 'room', 'assistants', 'semester'])->loadCount('enrollments');

        $members = $class->enrollments()
            ->with('user:id,nim,name,email,major,cohort_year')
            ->get()
            ->sortBy(fn (Enrollment $enrollment) => $enrollment->user->nim)
            ->values()
            ->map(fn (Enrollment $enrollment) => [
                'id' => $enrollment->id,
                'nim' => $enrollment->user->nim,
                'name' => $enrollment->user->name,
                'email' => $enrollment->user->email,
                'major' => $enrollment->user->major,
                'cohortYear' => $enrollment->user->cohort_year,
                'joinedAt' => $enrollment->joined_at->toIso8601String(),
            ]);

        return Inertia::render('asisten/class/show', [
            'klass' => (new LabClassResource($class))->resolve(),
            'members' => $members,
        ]);
    }

    /**
     * FR-ENR-04: keluarkan praktikan dengan alasan (soft delete; submission tetap).
     */
    public function destroy(Request $request, LabClass $class, Enrollment $enrollment): RedirectResponse
    {
        $this->authorizeAssistant($request, $class);
        abort_unless($enrollment->class_id === $class->id, 404);

        $validated = $request->validate(
            ['reason' => ['required', 'string', 'min:5', 'max:500']],
            [],
            ['reason' => 'alasan'],
        );

        $enrollment->forceFill(['removed_reason' => $validated['reason'], 'removed_by' => $request->user()->id])->save();
        $enrollment->delete();

        AuditLog::record('enrollment.removed', $class, ['user_id' => $enrollment->user_id], ['reason' => $validated['reason']]);
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$enrollment->user->name} dikeluarkan dari {$class->name}."]);

        return back();
    }

    private function authorizeAssistant(Request $request, LabClass $class): void
    {
        abort_unless($class->assistants()->whereKey($request->user()->id)->exists(), 403);
    }
}
