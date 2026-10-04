<?php

namespace App\Http\Controllers\Admin;

use App\Actions\LabClass\ManageClassAccess;
use App\Actions\LabClass\ReviewClass;
use App\Enums\ApprovalStatus;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ClassRequest;
use App\Http\Resources\LabClassResource;
use App\Models\AuditLog;
use App\Models\Course;
use App\Models\LabClass;
use App\Models\Room;
use App\Models\Semester;
use App\Models\User;
use App\Support\JoinToken;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin › Kelas & Jadwal (FR-ADM-04, US-D02-2/3): CRUD lintas mata kuliah,
 * deteksi bentrok, persetujuan kelas yang diajukan Asisten, token & lock.
 */
class ClassController extends Controller
{
    public function index(Request $request): Response
    {
        $semesters = Semester::query()->orderByDesc('start_date')->get(['id', 'name', 'status']);
        $semester = $request->filled('semester')
            ? $semesters->firstWhere('id', $request->integer('semester'))
            : ($semesters->firstWhere('status.value', 'active') ?? $semesters->first());

        $classes = $semester
            ? LabClass::forSemester($semester)
                ->with(['course', 'room', 'assistants', 'proposer', 'semester'])
                ->withCount('enrollments')
                ->orderBy('day_of_week')->orderBy('start_time')->get()
            : collect();

        return Inertia::render('admin/classes/index', [
            'semesters' => $semesters->map(fn (Semester $s) => ['id' => $s->id, 'name' => $s->name, 'status' => $s->status->value]),
            'semester' => $semester ? [
                'id' => $semester->id,
                'name' => $semester->name,
                'status' => $semester->status->value,
                'editable' => $semester->isEditable(),
            ] : null,
            'classes' => LabClassResource::collection($classes->where('approval_status', '!=', ApprovalStatus::Pending)->values())->resolve(),
            'pending' => LabClassResource::collection($classes->where('approval_status', ApprovalStatus::Pending)->values())->resolve(),
            'options' => [
                'courses' => $semester
                    ? Course::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)->orderBy('code')
                        ->get(['id', 'code', 'name'])->map(fn (Course $c) => ['id' => $c->id, 'label' => "{$c->code} · {$c->name}"])
                    : [],
                'rooms' => Room::orderBy('name')->get(['id', 'name'])->map(fn (Room $r) => ['id' => $r->id, 'label' => $r->name]),
                'assistants' => User::where('role', Role::Asisten)->where('is_active', true)->orderBy('name')
                    ->get(['id', 'name', 'nim'])->map(fn (User $u) => ['id' => $u->id, 'name' => $u->name, 'nim' => $u->nim]),
            ],
        ]);
    }

    public function store(ClassRequest $request): RedirectResponse
    {
        $semester = $request->semester();
        $class = new LabClass($request->safe()->except(['semester_id', 'assistant_ids', 'confirm_conflicts']));
        $class->semester()->associate($semester);
        $class->forceFill([
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'join_token' => JoinToken::generate($semester->id),
        ])->save();
        $class->assistants()->sync($request->validated('assistant_ids', []));

        AuditLog::record('class.created', $class, null, $request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$class->name} dibuat. Token: {$class->join_token}"]);

        return to_route('admin.classes.index', ['semester' => $semester->id]);
    }

    public function update(ClassRequest $request, LabClass $class): RedirectResponse
    {
        $before = [...$class->only(['course_id', 'name', 'day_of_week', 'start_time', 'end_time', 'room_id', 'quota']), 'assistant_ids' => $class->assistants()->pluck('users.id')->all()];

        $class->update($request->safe()->except(['assistant_ids', 'confirm_conflicts']));
        $class->assistants()->sync($request->validated('assistant_ids', []));

        AuditLog::record('class.updated', $class, $before, $request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$class->name} diperbarui."]);

        return to_route('admin.classes.index', ['semester' => $class->semester_id]);
    }

    public function destroy(LabClass $class): RedirectResponse
    {
        abort_unless($class->isEditable(), 403);

        AuditLog::record('class.deleted', $class, $class->only(['course_id', 'name', 'semester_id']));
        $class->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$class->name} dihapus."]);

        return to_route('admin.classes.index', ['semester' => $class->semester_id]);
    }

    public function approve(LabClass $class, ReviewClass $review): RedirectResponse
    {
        abort_unless($class->isEditable(), 403);
        $review->approve($class);

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$class->name} disetujui. Token: {$class->join_token}"]);

        return back();
    }

    public function reject(Request $request, LabClass $class, ReviewClass $review): RedirectResponse
    {
        abort_unless($class->isEditable(), 403);
        $validated = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:500']], [], ['reason' => 'alasan penolakan']);
        $review->reject($class, $validated['reason']);

        Inertia::flash('toast', ['type' => 'info', 'message' => "Pengajuan {$class->name} ditolak."]);

        return back();
    }

    public function regenerateToken(LabClass $class, ManageClassAccess $access): RedirectResponse
    {
        abort_unless($class->isEditable(), 403);
        $token = $access->regenerateToken($class);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Token baru {$class->name}: {$token}. Token lama tidak berlaku."]);

        return back();
    }

    public function lock(Request $request, LabClass $class, ManageClassAccess $access): RedirectResponse
    {
        abort_unless($class->isEditable(), 403);
        $access->setLocked($class, $request->boolean('locked'));

        return back();
    }
}
