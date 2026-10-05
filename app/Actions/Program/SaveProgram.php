<?php

namespace App\Actions\Program;

use App\Enums\ProgramType;
use App\Models\AuditLog;
use App\Models\Program;
use App\Models\Semester;
use App\Models\User;
use App\Support\Files\FileStore;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * FR-APR-02/03/04: simpan program, form pendaftaran, timeline, dan status.
 */
class SaveProgram
{
    public function __construct(private FileStore $files) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function save(User $user, array $data, ?UploadedFile $poster, ?Program $program = null): Program
    {
        return DB::transaction(function () use ($user, $data, $poster, $program) {
            $program ??= new Program(['type' => ProgramType::from($data['type']), 'created_by' => $user->id, 'semester_id' => Semester::current()?->id, 'status' => 'draft']);
            $before = $program->exists ? $program->only(['title', 'status', 'quota', 'starts_at']) : null;

            $program->fill(collect($data)->only([
                'title', 'category', 'description', 'speaker_name', 'speaker_affiliation', 'mode', 'location', 'room_id',
                'starts_at', 'ends_at', 'quota', 'fee_internal', 'fee_external', 'facilities', 'requirements',
                'opens_at', 'closes_at', 'staff_ids', 'result_notes',
            ])->all());
            $program->save();

            if ($poster) {
                $program->poster?->delete();
                $file = $this->files->store($poster, ['image'], 'program_poster', $program, $user, 'poster');
                $program->update(['poster_file_id' => $file->id]);
            }

            // Workshop & Quick Tutor dibuat dengan form bawaan agar langsung siap dibuka.
            if (! $before && $program->type->acceptsRegistrations() && ! $program->fields()->exists()) {
                $program->fields()->createMany([
                    ['order' => 1, 'label' => 'Nomor WhatsApp', 'type' => 'text', 'required' => true],
                    ['order' => 2, 'label' => 'Motivasi mengikuti program', 'type' => 'textarea', 'required' => false],
                ]);
            }

            AuditLog::record($before ? 'program.updated' : 'program.created', $program, $before, $program->only(['title', 'status', 'quota', 'starts_at']));

            if (($data['intent'] ?? null) === 'publish' && $program->status === 'draft') {
                $this->setStatus($program, 'open');
            }

            return $program;
        });
    }

    /**
     * @param  list<array{label: string, type: string, required?: bool, options?: list<string>|null, formats?: list<string>|null, max_mb?: int|null}>  $fields
     */
    public function syncFields(Program $program, array $fields): void
    {
        if ($program->registrations()->exists()) {
            throw ValidationException::withMessages(['fields' => 'Form tidak dapat diubah setelah ada pendaftar.']);
        }

        DB::transaction(function () use ($program, $fields) {
            $program->fields()->delete();
            foreach (array_values($fields) as $i => $f) {
                $program->fields()->create([
                    'order' => $i + 1,
                    'label' => $f['label'],
                    'type' => $f['type'],
                    'required' => (bool) ($f['required'] ?? false),
                    'options' => $f['type'] === 'select' ? array_values(array_filter(array_map('trim', $f['options'] ?? []))) : null,
                    'rules_json' => $f['type'] === 'file' ? ['formats' => $f['formats'] ?: ['pdf'], 'max_mb' => (int) ($f['max_mb'] ?? 5)] : null,
                ]);
            }
            AuditLog::record('program.form_saved', $program, null, ['fields' => count($fields)]);
        });
    }

    /**
     * @param  list<array{name: string, start_at?: string|null, end_at?: string|null}>  $stages
     */
    public function syncStages(Program $program, array $stages): void
    {
        if ($program->status !== 'draft' && $program->registrations()->whereNotNull('stage_results')->exists()) {
            throw ValidationException::withMessages(['stages' => 'Timeline tidak dapat diubah setelah penilaian pelamar dimulai.']);
        }

        DB::transaction(function () use ($program, $stages) {
            $program->stages()->delete();
            foreach (array_values($stages) as $i => $s) {
                $program->stages()->create(['order' => $i + 1, 'name' => $s['name'], 'start_at' => $s['start_at'] ?? null, 'end_at' => $s['end_at'] ?? null]);
            }
            $program->registrations()->update(['current_stage_id' => $program->stages()->value('id')]);
            AuditLog::record('program.timeline_saved', $program, null, ['stages' => count($stages)]);
        });
    }

    public function setStatus(Program $program, string $status): void
    {
        $allowed = ['draft' => ['open'], 'open' => ['closed'], 'closed' => ['open', 'finished'], 'finished' => []];

        if (! in_array($status, $allowed[$program->status] ?? [], true)) {
            throw ValidationException::withMessages(['status' => 'Perubahan status tidak diizinkan.']);
        }

        // FR-APR-03-4: "Buka Rekrutmen" hanya jika siap.
        if ($status === 'open' && $program->type === ProgramType::Recruitment && ! $program->isReady()) {
            throw ValidationException::withMessages(['status' => 'Lengkapi checklist kesiapan sebelum membuka rekrutmen.']);
        }

        $before = $program->status;
        $program->update(['status' => $status, ...($status === 'open' && ! $program->opens_at ? ['opens_at' => now()] : [])]);
        AuditLog::record('program.status', $program, ['status' => $before], ['status' => $status]);
    }
}
