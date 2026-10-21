<?php

namespace App\Http\Controllers\Asisten;

use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\CourseResource;
use App\Http\Resources\LabClassResource;
use App\Models\Course;
use App\Models\LabClass;
use App\Models\Room;
use App\Models\Semester;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Asisten › Class (FR-AC-01): kartu kelas yang diampu (anggota/kuota, lock,
 * token, status persetujuan), mata kuliah yang diampu, dan pengajuan.
 */
class ClassController extends Controller
{
    public function index(Request $request): Response
    {
        $semester = Semester::current();
        $user = $request->user();

        $myCourses = $semester
            ? $user->courses()->forSemester($semester)
                ->where('approval_status', ApprovalStatus::Approved)
                ->with(['assistants', 'semester'])->orderBy('code')->get()
            : collect();

        $myProposals = $semester
            ? Course::forSemester($semester)->where('proposed_by', $user->id)
                ->where('approval_status', '!=', ApprovalStatus::Approved)
                ->with('semester')->latest()->get()
            : collect();

        $myClasses = $semester
            ? LabClass::forSemester($semester)
                // FR-ADM-11: Admin melihat seluruh kelas; Asisten kelas yang diampu/diajukan.
                ->when(! $user->isAdmin(), fn ($query) => $query->where(fn ($q) => $q
                    ->taughtBy($user)
                    ->orWhere('proposed_by', $user->id)))
                ->with(['course', 'room', 'assistants', 'semester'])
                ->withCount('enrollments')
                ->orderBy('day_of_week')->orderBy('start_time')->get()
            : collect();

        return Inertia::render('asisten/class/index', [
            'semester' => $semester?->only(['id', 'name']),
            'classes' => LabClassResource::collection($myClasses)->resolve(),
            'options' => [
                'courses' => $myCourses->map(fn (Course $c) => ['id' => $c->id, 'label' => "{$c->code} · {$c->name}"])->values(),
                'rooms' => Room::orderBy('name')->get(['id', 'name'])->map(fn (Room $r) => ['id' => $r->id, 'label' => $r->name]),
            ],
            'proposals' => CourseResource::collection($myProposals)->resolve(),
        ]);
    }
}
