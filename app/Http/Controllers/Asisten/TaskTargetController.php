<?php

namespace App\Http\Controllers\Asisten;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\TaskTarget;
use App\Support\Notifications\Notify;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Aksi cepat per kelas di Manajemen Post-Test/Pre-Test/Laporan (Figma):
 * Tambah Waktu · Berhenti · Buka Manual.
 */
class TaskTargetController extends Controller
{
    /** Opsi "Tambah Waktu" (menit). */
    public const EXTEND_OPTIONS = [5, 10, 15, 30, 60];

    /** Durasi default saat dibuka manual tanpa tenggat yang masih berlaku. */
    private const MANUAL_OPEN_MINUTES = 60;

    public function extend(Request $request, TaskTarget $target): RedirectResponse
    {
        $this->authorizeTarget($request, $target, ['open', 'closed']);
        $minutes = (int) $request->validate(['minutes' => ['required', 'integer', 'in:'.implode(',', self::EXTEND_OPTIONS)]])['minutes'];

        $before = $target->due_at;
        // Dari tenggat lama bila masih di depan; dari sekarang bila sudah lewat.
        $base = $target->due_at !== null && $target->due_at->isFuture() ? $target->due_at : now();
        $target->forceFill(['due_at' => $base->copy()->addMinutes($minutes), 'closed_at' => null])->save();

        AuditLog::record('task_target.extended', $target, ['due_at' => $before?->toIso8601String()], ['due_at' => $target->due_at->toIso8601String(), 'minutes' => $minutes]);
        $this->notifyStudents($target, "Waktu ditambah {$minutes} menit: {$target->task->title}", 'Tenggat baru '.$target->due_at->locale('id')->translatedFormat('d M Y H:i').' WIB.');

        Inertia::flash('toast', ['type' => 'success', 'message' => "Waktu {$target->labClass->name} ditambah {$minutes} menit."]);

        return back();
    }

    public function close(Request $request, TaskTarget $target): RedirectResponse
    {
        $this->authorizeTarget($request, $target, ['open']);

        $target->forceFill([
            'closed_at' => now(),
            'due_at' => $target->due_at === null || $target->due_at->isFuture() ? now() : $target->due_at,
        ])->save();

        AuditLog::record('task_target.closed', $target, null, ['closed_at' => $target->closed_at->toIso8601String()]);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Pengumpulan {$target->labClass->name} dihentikan."]);

        return back();
    }

    public function open(Request $request, TaskTarget $target): RedirectResponse
    {
        $this->authorizeTarget($request, $target, ['scheduled']);

        $due = $target->due_at !== null && $target->due_at->isFuture()
            ? $target->due_at
            : now()->addMinutes($target->window_minutes ?? self::MANUAL_OPEN_MINUTES);
        $target->forceFill(['open_at' => now(), 'due_at' => $due, 'closed_at' => null])->save();

        AuditLog::record('task_target.opened_manually', $target, null, ['due_at' => $due->toIso8601String()]);
        $this->notifyStudents($target, "Tugas dibuka: {$target->task->title}", 'Tenggat '.$due->locale('id')->translatedFormat('d M Y H:i').' WIB.');

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$target->task->title} dibuka untuk {$target->labClass->name}."]);

        return back();
    }

    /**
     * @param  list<string>  $states
     */
    private function authorizeTarget(Request $request, TaskTarget $target, array $states): void
    {
        $target->load(['task', 'labClass']);
        abort_unless($target->task->isManagedBy($request->user()), 403);
        abort_unless(in_array($target->state(), $states, true), 422, 'Aksi ini tidak tersedia untuk status tugas saat ini.');
    }

    private function notifyStudents(TaskTarget $target, string $title, string $body): void
    {
        Notify::send(
            $target->labClass->enrollments()->pluck('user_id')->all(),
            'task',
            $title,
            $body,
            '/praktikan/tasks/'.$target->id,
        );
    }
}
