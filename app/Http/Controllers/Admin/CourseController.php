<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Course\ReviewCourse;
use App\Enums\ApprovalStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\CourseRequest;
use App\Http\Resources\CourseResource;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin › Mata Kuliah (US-D02, FR-ADM-03): CRUD, bobot, asisten pengampu,
 * dan antrian persetujuan pengajuan Asisten.
 */
class CourseController extends Controller
{
    public function index(Request $request): Response
    {
        $semesters = Semester::query()->orderByDesc('start_date')->get(['id', 'name', 'status']);

        // FR-ADM-02: default semester aktif; ?semester= untuk melihat arsip.
        $semester = $request->filled('semester')
            ? $semesters->firstWhere('id', $request->integer('semester'))
            : ($semesters->firstWhere('status.value', 'active') ?? $semesters->first());

        $courses = $semester
            ? Course::forSemester($semester)->with(['assistants', 'proposer', 'semester'])->orderBy('code')->get()
            : collect();

        return Inertia::render('admin/courses/index', [
            'semesters' => $semesters->map(fn (Semester $s) => ['id' => $s->id, 'name' => $s->name, 'status' => $s->status->value]),
            'semester' => $semester ? [
                'id' => $semester->id,
                'name' => $semester->name,
                'status' => $semester->status->value,
                'editable' => $semester->isEditable(),
            ] : null,
            'courses' => CourseResource::collection(
                $courses->where('approval_status', '!=', ApprovalStatus::Pending)->values(),
            )->resolve(),
            'pending' => CourseResource::collection(
                $courses->where('approval_status', ApprovalStatus::Pending)->sortBy('created_at')->values(),
            )->resolve(),
            'assistants' => User::where('role', Role::Asisten)->where('is_active', true)->orderBy('name')
                ->get(['id', 'name', 'nim'])
                ->map(fn (User $user) => ['id' => $user->id, 'name' => $user->name, 'nim' => $user->nim]),
        ]);
    }

    public function store(CourseRequest $request): RedirectResponse
    {
        $semester = $request->semester();
        $course = new Course($request->safe()->except(['semester_id', 'assistant_ids']));
        $course->semester()->associate($semester);
        $course->forceFill(['approved_by' => $request->user()->id, 'approved_at' => now()])->save();
        $course->assistants()->sync($request->validated('assistant_ids', []));

        AuditLog::record('course.created', $course, null, $request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$course->code} {$course->name} ditambahkan."]);

        return to_route('admin.courses.index', ['semester' => $semester->id]);
    }

    public function update(CourseRequest $request, Course $course): RedirectResponse
    {
        $before = [...$course->only(['code', 'name', 'color', 'credits', 'weight_pretest', 'weight_posttest', 'weight_report']), 'assistant_ids' => $course->assistants()->pluck('users.id')->all()];

        $course->update($request->safe()->except('assistant_ids'));
        $course->assistants()->sync($request->validated('assistant_ids', []));

        AuditLog::record('course.updated', $course, $before, $request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$course->code} {$course->name} diperbarui."]);

        return to_route('admin.courses.index', ['semester' => $course->semester_id]);
    }

    public function destroy(Course $course): RedirectResponse
    {
        abort_unless($course->isEditable(), 403);

        if ($course->classes()->exists()) {
            throw ValidationException::withMessages([
                'course' => "{$course->code} masih memiliki kelas. Hapus kelasnya terlebih dahulu.",
            ]);
        }

        AuditLog::record('course.deleted', $course, $course->only(['code', 'name', 'semester_id']));
        $course->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$course->code} {$course->name} dihapus."]);

        return to_route('admin.courses.index', ['semester' => $course->semester_id]);
    }

    public function approve(Course $course, ReviewCourse $review): RedirectResponse
    {
        abort_unless($course->isEditable(), 403);
        $review->approve($course);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Pengajuan {$course->name} disetujui."]);

        return back();
    }

    public function reject(Request $request, Course $course, ReviewCourse $review): RedirectResponse
    {
        abort_unless($course->isEditable(), 403);
        $validated = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:500']], [], ['reason' => 'alasan penolakan']);
        $review->reject($course, $validated['reason']);

        Inertia::flash('toast', ['type' => 'info', 'message' => "Pengajuan {$course->name} ditolak. Asisten dapat merevisi dan mengajukan ulang."]);

        return back();
    }
}
