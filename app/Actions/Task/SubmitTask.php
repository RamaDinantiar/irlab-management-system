<?php

namespace App\Actions\Task;

use App\Models\AuditLog;
use App\Models\StoredFile;
use App\Models\Submission;
use App\Models\TaskTarget;
use App\Models\User;
use App\Support\Files\FileStore;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * US-P02: kumpulkan tugas. Validasi format sesuai pengaturan tugas, versi baru
 * menggantikan versi lama (riwayat tetap), label terlambat, nomor tanda terima.
 * Gagal di tengah jalan → tidak ada submission/ file setengah jadi.
 */
class SubmitTask
{
    public function __construct(private readonly FileStore $files) {}

    public function __invoke(User $user, TaskTarget $target, ?UploadedFile $upload, ?string $text): Submission
    {
        $task = $target->task;
        $now = now();
        $text = $text !== null ? trim($text) : null;

        if ($target->state($now) !== 'open') {
            $this->fail('submission', match (true) {
                $target->state($now) !== 'closed' => 'Tugas belum dibuka.',
                $target->closed_at !== null => 'Pengumpulan sudah dihentikan oleh asisten.',
                default => 'Tenggat sudah lewat; tugas ini tidak menerima pengumpulan terlambat.',
            });
        }

        $previous = Submission::where('task_target_id', $target->id)->where('user_id', $user->id)->where('is_current', true)->first();

        // US-P02-4: penggantian hanya sebelum tenggat.
        if ($previous && $target->isPastDue($now)) {
            $this->fail('submission', 'Tenggat sudah lewat; submission tidak dapat diganti.');
        }

        if ($task->allowed_formats !== [] && $upload === null && $task->text_answer !== 'required') {
            $this->fail('file', 'Unggah file jawaban ('.strtoupper(implode('/', $task->allowed_formats)).').');
        }

        if ($task->text_answer === 'required' && ($text === null || $text === '')) {
            $this->fail('text_answer', 'Jawaban teks wajib diisi.');
        }

        if ($task->text_answer === 'none') {
            $text = null;
        }

        if ($upload === null && ($text === null || $text === '')) {
            $this->fail('file', 'Isi jawaban teks atau unggah file.');
        }

        $stored = null;

        try {
            return DB::transaction(function () use ($user, $target, $upload, $text, $previous, $now, &$stored) {
                $lateMinutes = $target->isPastDue($now) ? max(1, (int) floor($target->due_at->diffInMinutes($now))) : 0;

                $previous?->forceFill(['is_current' => false])->save();

                $submission = Submission::create([
                    'task_target_id' => $target->id,
                    'user_id' => $user->id,
                    'text_answer' => $text,
                    'submitted_at' => $now,
                    'is_late' => $lateMinutes > 0,
                    'late_minutes' => $lateMinutes,
                    'version' => ($previous?->version ?? 0) + 1,
                    'is_current' => true,
                ]);

                // FR-PT-05: nomor tanda terima.
                $submission->forceFill(['receipt_number' => sprintf('IRL-%s-%06d', $now->format('ymd'), $submission->id)])->save();

                if ($upload) {
                    $stored = $this->files->store($upload, $target->task->allowed_formats, 'submission', $submission, $user);
                }

                AuditLog::record('submission.created', $submission, null, ['version' => $submission->version, 'late' => $submission->is_late]);

                return $submission;
            });
        } catch (Throwable $exception) {
            // Transaksi dibatalkan → hapus file yang sudah sempat tersimpan.
            if ($stored instanceof StoredFile) {
                $stored->delete();
            }

            throw $exception;
        }
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
