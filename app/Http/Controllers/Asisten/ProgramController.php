<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\Program\ReviewApplicant;
use App\Actions\Program\SaveProgram;
use App\Enums\ProgramType;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Program;
use App\Models\ProgramFormField;
use App\Models\ProgramRegistration;
use App\Models\ProgramStage;
use App\Models\Room;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Asisten (& Admin) › Program (FR-APR-01…04).
 */
class ProgramController extends Controller
{
    public function index(Request $request, string $type = 'workshop'): Response
    {
        $programType = ProgramType::fromSlug($type);
        $programs = Program::where('type', $programType)->withCount(['registrations' => fn ($q) => $q->where('status', '!=', 'cancelled')])
            ->with('poster')->orderByRaw("CASE status WHEN 'open' THEN 0 WHEN 'draft' THEN 1 WHEN 'closed' THEN 2 ELSE 3 END")
            ->orderByDesc('starts_at')->get();

        $staff = User::whereIn('id', $programs->pluck('staff_ids')->flatten()->filter()->unique())->pluck('name', 'id');

        return Inertia::render('asisten/programs/index', [
            'type' => ['value' => $programType->value, 'slug' => $programType->slug(), 'label' => $programType->label()],
            'programs' => $programs->map(fn (Program $p) => [...self::card($p), 'staff' => collect($p->staff_ids ?? [])->map(fn ($id) => $staff[$id] ?? null)->filter()->values()]),
            'stats' => [
                'total' => $programs->count(),
                'open' => $programs->where('status', 'open')->count(),
                'registrants' => $programs->whereIn('status', ['open', 'closed'])->sum('registrations_count'),
                'capacity' => $programs->whereIn('status', ['open', 'closed'])->sum('quota'),
                'finished' => $programs->where('status', 'finished')->count(),
            ],
            'options' => self::options(),
        ]);
    }

    public function store(Request $request, SaveProgram $save): RedirectResponse
    {
        $program = $save->save($request->user(), $this->validated($request), $request->file('poster'));
        Inertia::flash('toast', ['type' => 'success', 'message' => $program->status === 'open' ? "{$program->title} dipublikasikan." : "{$program->title} disimpan."]);

        return $program->type === ProgramType::Maintenance
            ? back()
            : to_route('asisten.programs.show', $program);
    }

    public function update(Request $request, Program $program, SaveProgram $save): RedirectResponse
    {
        $save->save($request->user(), $this->validated($request, $program), $request->file('poster'), $program);
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$program->title} diperbarui."]);

        return back();
    }

    public function destroy(Program $program): RedirectResponse
    {
        abort_if($program->registrations()->exists(), 422, 'Program yang sudah memiliki pendaftar tidak dapat dihapus.');

        AuditLog::record('program.deleted', $program, $program->only(['title', 'type', 'status']));
        $type = $program->type;
        $program->poster?->delete();
        $program->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Program dihapus.']);

        return to_route('asisten.programs.index', ['type' => $type->slug()]);
    }

    /**
     * Kelola program: peserta/pipeline, form, timeline, kesiapan.
     */
    public function show(Program $program): Response
    {
        abort_if($program->type === ProgramType::Maintenance, 404);
        $program->load(['stages', 'fields', 'poster']);
        $stages = $program->stages;

        return Inertia::render('asisten/programs/show', [
            'program' => [...self::card($program->loadCount(['registrations' => fn ($q) => $q->where('status', '!=', 'cancelled')])), ...self::detail($program)],
            'stages' => $stages->map(fn (ProgramStage $s) => ['id' => $s->id, 'name' => $s->name, 'startAt' => $s->start_at?->toDateString(), 'endAt' => $s->end_at?->toDateString()])->values(),
            'fields' => $program->fields->map(fn (ProgramFormField $f) => self::field($f))->values(),
            'readiness' => $program->readiness(),
            'registrations' => $program->registrations()->with(['user:id,name,nim,email,major', 'currentStage'])->latest()->get()->map(fn (ProgramRegistration $r) => [
                'id' => $r->id,
                'name' => $r->user->name,
                'nim' => $r->user->nim,
                'email' => $r->user->email,
                'major' => $r->user->major,
                'status' => $r->status,
                'attended' => $r->attended,
                'stageId' => $r->current_stage_id,
                'stageResults' => $r->stage_results ?? (object) [],
                'answers' => $program->fields->map(fn (ProgramFormField $f) => [
                    'label' => $f->label,
                    'value' => self::answer($r, $f),
                ])->values(),
                'createdAt' => $r->created_at->toIso8601String(),
            ])->values(),
            'archive' => $program->type === ProgramType::Recruitment
                ? Program::where('type', ProgramType::Recruitment)->where('status', 'finished')->whereKeyNot($program->id)->withCount([
                    'registrations', 'registrations as accepted_count' => fn ($q) => $q->where('status', 'accepted'),
                ])->latest('starts_at')->get()->map(fn (Program $p) => ['id' => $p->id, 'title' => $p->title, 'year' => $p->starts_at?->year ?? $p->created_at->year, 'applicants' => $p->registrations_count, 'accepted' => $p->accepted_count])->values()
                : [],
            'options' => self::options(),
        ]);
    }

    public function updateFields(Request $request, Program $program, SaveProgram $save): RedirectResponse
    {
        $validated = $request->validate([
            'fields' => ['present', 'array', 'max:30'],
            'fields.*.label' => ['required', 'string', 'max:150'],
            'fields.*.type' => ['required', Rule::in(ProgramFormField::TYPES)],
            'fields.*.required' => ['boolean'],
            'fields.*.options' => ['nullable', 'array', 'required_if:fields.*.type,select'],
            'fields.*.options.*' => ['string', 'max:100'],
            'fields.*.formats' => ['nullable', 'array'],
            'fields.*.formats.*' => [Rule::in(['pdf', 'zip', 'jpg', 'jpeg', 'png'])],
            'fields.*.max_mb' => ['nullable', 'integer', 'between:1,20'],
        ], [], ['fields.*.label' => 'label field', 'fields.*.options' => 'pilihan']);

        $save->syncFields($program, $validated['fields']);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Form pendaftaran disimpan.']);

        return back();
    }

    public function updateStages(Request $request, Program $program, SaveProgram $save): RedirectResponse
    {
        $validated = $request->validate([
            'stages' => ['present', 'array', 'max:10'],
            'stages.*.name' => ['required', 'string', 'max:100'],
            'stages.*.start_at' => ['nullable', 'date'],
            'stages.*.end_at' => ['nullable', 'date', 'after_or_equal:stages.*.start_at'],
            'requirements' => ['nullable', 'array', 'max:20'],
            'requirements.*' => ['string', 'max:200'],
        ], [], ['stages.*.name' => 'nama tahap', 'stages.*.end_at' => 'tanggal selesai']);

        $save->syncStages($program, $validated['stages']);
        $program->update(['requirements' => array_values(array_filter($validated['requirements'] ?? []))]);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Timeline & persyaratan disimpan.']);

        return back();
    }

    public function status(Request $request, Program $program, SaveProgram $save): RedirectResponse
    {
        $validated = $request->validate(['status' => ['required', Rule::in(['open', 'closed', 'finished'])]]);
        $save->setStatus($program, $validated['status']);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Status program: '.Program::STATUS_LABELS[$validated['status']].'.']);

        return back();
    }

    /** FR-APR-02: presensi peserta. */
    public function attendance(Request $request, ProgramRegistration $registration): RedirectResponse
    {
        $registration->update(['attended' => $request->boolean('attended')]);

        return back();
    }

    public function review(Request $request, ProgramRegistration $registration, ReviewApplicant $review): RedirectResponse
    {
        $validated = $request->validate(['pass' => ['required', 'boolean'], 'note' => ['nullable', 'string', 'max:500']]);
        $review($request->user(), $registration, $request->boolean('pass'), $validated['note'] ?? null);
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$registration->user->name}: ".ProgramRegistration::STATUS_LABELS[$registration->fresh()->status].'.']);

        return back();
    }

    /** FR-APR-02: ekspor peserta ke Excel. */
    public function export(Program $program): StreamedResponse
    {
        $program->load('fields');
        $rows = $program->registrations()->with('user')->get();

        return response()->streamDownload(function () use ($program, $rows) {
            $writer = new Writer;
            $writer->openToFile('php://output');
            $writer->addRow(Row::fromValues(['NIM', 'Nama', 'Email', 'Program Studi', 'Status', 'Hadir', 'Mendaftar', ...$program->fields->pluck('label')->all()]));
            foreach ($rows as $r) {
                $writer->addRow(Row::fromValues([
                    $r->user->nim, $r->user->name, $r->user->email, $r->user->major,
                    ProgramRegistration::STATUS_LABELS[$r->status], $r->attended ? 'Ya' : 'Tidak', $r->created_at->format('Y-m-d H:i'),
                    ...$program->fields->map(fn (ProgramFormField $f) => is_array($v = self::answer($r, $f)) ? $v['name'] : $v)->all(),
                ]));
            }
            $writer->close();
        }, str($program->title)->slug().'-peserta.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Program $program = null): array
    {
        $type = $program?->type ?? ProgramType::tryFrom((string) $request->input('type'));
        abort_unless($type, 422);
        $maintenance = $type === ProgramType::Maintenance;

        $data = $request->validate([
            'type' => [$program ? 'nullable' : 'required', Rule::enum(ProgramType::class)],
            'title' => ['required', 'string', 'max:150'],
            'category' => ['nullable', 'string', 'max:100'],
            'description' => [$maintenance ? 'required' : 'nullable', 'string', 'max:5000'],
            'speaker_name' => ['nullable', 'string', 'max:120'],
            'speaker_affiliation' => ['nullable', 'string', 'max:150'],
            'mode' => ['nullable', Rule::in(['offline', 'online'])],
            'location' => ['nullable', 'string', 'max:200'],
            'room_id' => ['nullable', 'integer', 'exists:rooms,id'],
            'starts_at' => [$type === ProgramType::Recruitment ? 'nullable' : 'required', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'quota' => ['nullable', 'integer', 'min:1', 'max:5000'],
            'fee_internal' => ['nullable', 'integer', 'min:0'],
            'fee_external' => ['nullable', 'integer', 'min:0'],
            'facilities' => ['nullable', 'array'],
            'facilities.*' => ['string', 'max:100'],
            'opens_at' => ['nullable', 'date'],
            'closes_at' => ['nullable', 'date', 'after:opens_at'],
            'staff_ids' => ['nullable', 'array'],
            'staff_ids.*' => ['integer', Rule::exists('users', 'id')->where('role', Role::Asisten->value)],
            'result_notes' => ['nullable', 'string', 'max:3000'],
            'poster' => ['nullable', 'file'],
            'intent' => ['nullable', Rule::in(['draft', 'publish'])],
        ], [], [
            'title' => 'judul', 'description' => $maintenance ? 'perangkat yang ditangani' : 'deskripsi', 'starts_at' => 'jadwal mulai',
            'ends_at' => 'jadwal selesai', 'closes_at' => 'penutupan pendaftaran', 'quota' => 'kuota',
        ]);

        return [...$data, 'type' => $type->value, 'mode' => $data['mode'] ?? 'offline', 'facilities' => array_values($data['facilities'] ?? []), 'staff_ids' => array_values(array_map('intval', $data['staff_ids'] ?? []))];
    }

    /**
     * @return array<string, mixed>
     */
    public static function card(Program $p): array
    {
        return [
            'id' => $p->id,
            'type' => $p->type->value,
            'typeSlug' => $p->type->slug(),
            'title' => $p->title,
            'category' => $p->category,
            'speakerName' => $p->speaker_name,
            'speakerAffiliation' => $p->speaker_affiliation,
            'mode' => $p->mode,
            'location' => $p->location,
            'startsAt' => $p->starts_at?->toIso8601String(),
            'endsAt' => $p->ends_at?->toIso8601String(),
            'quota' => $p->quota,
            'registered' => $p->registrations_count ?? $p->registrations()->where('status', '!=', 'cancelled')->count(),
            'feeInternal' => $p->fee_internal,
            'feeExternal' => $p->fee_external,
            'status' => $p->status,
            'accepting' => $p->isAcceptingRegistrations(),
            'opensAt' => $p->opens_at?->toIso8601String(),
            'closesAt' => $p->closes_at?->toIso8601String(),
            'poster' => $p->poster?->url(inline: true),
            'description' => $p->description,
            'resultNotes' => $p->result_notes,
            'staffIds' => $p->staff_ids ?? [],
            'roomId' => $p->room_id,
            'facilities' => $p->facilities ?? [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function detail(Program $p): array
    {
        return ['facilities' => $p->facilities ?? [], 'requirements' => $p->requirements ?? [], 'ready' => $p->isReady()];
    }

    /**
     * @return array<string, mixed>
     */
    public static function field(ProgramFormField $f): array
    {
        return [
            'id' => $f->id,
            'label' => $f->label,
            'type' => $f->type,
            'required' => $f->required,
            'options' => $f->options ?? [],
            'formats' => $f->rules_json['formats'] ?? ['pdf'],
            'maxMb' => $f->rules_json['max_mb'] ?? 5,
        ];
    }

    /**
     * @return array{name: string, url: string}|string|int|float|null
     */
    private static function answer(ProgramRegistration $r, ProgramFormField $f): mixed
    {
        $value = $r->answers_json[(string) $f->id] ?? null;

        if (is_array($value) && isset($value['file_id'])) {
            $file = $r->files()->find($value['file_id']);

            return $file ? ['name' => $file->original_name, 'url' => $file->url()] : null;
        }

        return $value;
    }

    /**
     * @return array<string, mixed>
     */
    private static function options(): array
    {
        return [
            'assistants' => User::where('role', Role::Asisten)->where('is_active', true)->orderBy('name')->get(['id', 'name']),
            'rooms' => Room::orderBy('name')->get(['id', 'name']),
        ];
    }
}
