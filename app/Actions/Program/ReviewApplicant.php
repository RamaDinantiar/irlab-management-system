<?php

namespace App\Actions\Program;

use App\Models\AuditLog;
use App\Models\ProgramRegistration;
use App\Models\ProgramStage;
use App\Models\User;
use App\Support\Notifications\Notify;
use Illuminate\Validation\ValidationException;

/**
 * FR-APR-03-5: pipeline pelamar per tahap — Lolos memajukan ke tahap
 * berikutnya (tahap terakhir → Diterima), Tidak Lolos → Ditolak.
 */
class ReviewApplicant
{
    public function __invoke(User $reviewer, ProgramRegistration $registration, bool $pass, ?string $note): void
    {
        $registration->loadMissing(['program', 'currentStage']);
        $stages = $registration->program->stages()->get()->values();
        $stage = $registration->currentStage ?? $stages->first();

        if ($registration->program->status === 'finished') {
            throw ValidationException::withMessages(['registration' => 'Program sudah diarsipkan (read-only).']);
        }

        if (! $stage || in_array($registration->status, ['accepted', 'rejected', 'cancelled'], true)) {
            throw ValidationException::withMessages(['registration' => 'Pelamar ini sudah selesai diproses.']);
        }

        $results = $registration->stage_results ?? [];
        $results[(string) $stage->id] = ['result' => $pass ? 'pass' : 'fail', 'note' => $note, 'by' => $reviewer->name, 'at' => now()->toIso8601String()];

        $index = $stages->search(fn (ProgramStage $s) => $s->id === $stage->id);
        $next = $stages[$index + 1] ?? null;
        $status = match (true) {
            ! $pass => 'rejected',
            $next === null => 'accepted',
            $index === 0 => 'passed_docs',
            default => 'testing',
        };

        $before = ['status' => $registration->status, 'stage' => $stage->name];
        $registration->update(['stage_results' => $results, 'status' => $status, 'current_stage_id' => $pass && $next ? $next->id : $stage->id]);
        AuditLog::record('program.reviewed', $registration, $before, ['status' => $status, 'stage' => $stage->name, 'note' => $note]);

        Notify::send([$registration->user_id], 'program', 'Status pendaftaran: '.ProgramRegistration::STATUS_LABELS[$status],
            "{$registration->program->title} — tahap {$stage->name}".($next && $pass ? ", lanjut ke {$next->name}." : '.'),
            '/praktikan/programs/'.$registration->program_id);
    }
}
