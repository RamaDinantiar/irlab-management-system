<?php

namespace App\Http\Controllers\Praktikan;

use App\Actions\Program\RegisterForProgram;
use App\Enums\ProgramType;
use App\Http\Controllers\Asisten\ProgramController as ManageProgramController;
use App\Http\Controllers\Controller;
use App\Models\Program;
use App\Models\ProgramFormField;
use App\Models\ProgramRegistration;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Praktikan › Program (FR-PP-01…03): etalase, pendaftaran, Program Saya.
 */
class ProgramController extends Controller
{
    public function index(Request $request, ?string $type = null): Response
    {
        $programType = $type ? ProgramType::fromSlug($type) : null;
        abort_if($programType === ProgramType::Maintenance, 404);

        $mine = ProgramRegistration::where('user_id', $request->user()->id)->with('program')->latest()->get();

        return Inertia::render('praktikan/programs/index', [
            'type' => $programType ? ['value' => $programType->value, 'slug' => $programType->slug(), 'label' => $programType->label()] : null,
            'programs' => Program::catalog()->when($programType, fn ($q) => $q->where('type', $programType))
                ->withCount(['registrations' => fn ($q) => $q->where('status', '!=', 'cancelled')])->with('poster')
                ->orderByRaw("CASE status WHEN 'open' THEN 0 WHEN 'closed' THEN 1 ELSE 2 END")->orderByDesc('starts_at')->get()
                ->map(fn (Program $p) => [...ManageProgramController::card($p), 'myStatus' => $mine->firstWhere('program_id', $p->id)?->status])->values(),
            'mine' => $mine->map(fn (ProgramRegistration $r) => [
                'id' => $r->id,
                'programId' => $r->program_id,
                'title' => $r->program->title,
                'type' => $r->program->type->label(),
                'status' => $r->status,
                'startsAt' => $r->program->starts_at?->toIso8601String(),
                'createdAt' => $r->created_at->toIso8601String(),
            ])->values(),
        ]);
    }

    public function show(Request $request, Program $program): Response
    {
        abort_unless(in_array($program->status, ['open', 'closed', 'finished'], true) && $program->type->acceptsRegistrations(), 404);
        $program->load(['fields', 'stages', 'poster'])->loadCount(['registrations' => fn ($q) => $q->where('status', '!=', 'cancelled')]);
        $registration = $program->registrations()->where('user_id', $request->user()->id)->with('currentStage')->first();

        return Inertia::render('praktikan/programs/show', [
            'program' => [...ManageProgramController::card($program), 'facilities' => $program->facilities ?? [], 'requirements' => $program->requirements ?? [], 'full' => $program->isFull()],
            'stages' => $program->stages->map(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'startAt' => $s->start_at?->toDateString(), 'endAt' => $s->end_at?->toDateString()])->values(),
            'fields' => $program->fields->map(fn (ProgramFormField $f) => ManageProgramController::field($f))->values(),
            'registration' => $registration ? [
                'status' => $registration->status,
                'stageId' => $registration->current_stage_id,
                'stageResults' => collect($registration->stage_results ?? [])->map(fn ($r) => ['result' => $r['result'], 'at' => $r['at']]),
                'createdAt' => $registration->created_at->toIso8601String(),
            ] : null,
        ]);
    }

    public function register(Request $request, Program $program, RegisterForProgram $register): RedirectResponse
    {
        $register($request->user(), $program, (array) $request->input('answers', []), array_filter((array) $request->file('answers', [])));
        Inertia::flash('toast', ['type' => 'success', 'message' => "Pendaftaran {$program->title} berhasil."]);

        return to_route('praktikan.programs.show', $program);
    }
}
