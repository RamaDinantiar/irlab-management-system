<?php

namespace App\Actions\Enrollment;

use App\Enums\ApprovalStatus;
use App\Models\AuditLog;
use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\Semester;
use App\Models\User;
use App\Support\JoinToken;
use App\Support\Notifications\Notify;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * US-P01 / FR-ENR-02: Praktikan bergabung ke kelas dengan token 6 karakter.
 * Dijalankan dalam transaksi + lockForUpdate pada baris kelas agar kuota tidak
 * terlampaui saat banyak praktikan bergabung bersamaan (FR-ENR-02/03).
 */
class JoinClass
{
    /** US-P01-7: 5 percobaan gagal per 10 menit per akun. */
    public const MAX_FAILED_ATTEMPTS = 5;

    public const DECAY_SECONDS = 600;

    /** US-P01-3: pesan sama untuk kode salah/kedaluwarsa, tanpa detail kelas lain. */
    private const NOT_FOUND = 'Kode kelas tidak ditemukan.';

    public function __invoke(User $user, string $input): LabClass
    {
        $key = 'join-class:'.$user->id;

        if (RateLimiter::tooManyAttempts($key, self::MAX_FAILED_ATTEMPTS)) {
            $minutes = (int) ceil(RateLimiter::availableIn($key) / 60);
            $this->fail("Terlalu banyak percobaan kode yang salah. Coba lagi dalam {$minutes} menit.");
        }

        $token = strtoupper(trim($input));

        try {
            return DB::transaction(fn () => $this->join($user, $token));
        } catch (ValidationException $exception) {
            // Hanya kode yang tidak ditemukan yang dihitung sebagai percobaan gagal.
            if (($exception->errors()['token'][0] ?? null) === self::NOT_FOUND) {
                RateLimiter::hit($key, self::DECAY_SECONDS);
            }

            throw $exception;
        }
    }

    private function join(User $user, string $token): LabClass
    {
        $semester = Semester::current();

        // US-P01-3: tanpa mengungkap detail kelas lain.
        if (! $semester || ! preg_match('/^['.JoinToken::ALPHABET.']{'.JoinToken::LENGTH.'}$/', $token)) {
            $this->fail(self::NOT_FOUND);
        }

        $class = LabClass::forSemester($semester)
            ->where('join_token', $token)
            ->where('approval_status', ApprovalStatus::Approved)
            ->lockForUpdate()
            ->first() ?? $this->fail(self::NOT_FOUND);

        $existing = Enrollment::withTrashed()->where('class_id', $class->id)->where('user_id', $user->id)->first();

        // US-P01-5
        if ($existing && ! $existing->trashed()) {
            $this->fail('Anda sudah tergabung di kelas ini.');
        }

        $members = $class->enrollments()->count();

        // US-P01-4
        if ($class->is_locked || $members >= $class->quota) {
            $this->fail('Kelas sudah ditutup, hubungi asisten.');
        }

        // US-P01-6 / FR-ENR-05: satu kelas per mata kuliah per semester.
        $sameCourse = Enrollment::whereHas('labClass', fn ($query) => $query
            ->where('course_id', $class->course_id)
            ->whereKeyNot($class->id))
            ->where('user_id', $user->id)
            ->with('labClass')
            ->first();

        if ($sameCourse) {
            $this->fail("Anda sudah terdaftar di {$class->course->name} · {$sameCourse->labClass->name}. Satu mata kuliah hanya boleh diikuti di satu kelas.");
        }

        if ($existing) {
            $existing->restore();
            $existing->forceFill(['joined_at' => now(), 'removed_reason' => null, 'removed_by' => null])->save();
        } else {
            Enrollment::create(['class_id' => $class->id, 'user_id' => $user->id, 'joined_at' => now()]);
        }

        AuditLog::record('enrollment.joined', $class, null, ['user_id' => $user->id]);

        // US-A01-5: kelas terkunci otomatis saat kuota penuh.
        if ($members + 1 >= $class->quota) {
            $class->forceFill(['is_locked' => true])->save();
            AuditLog::record('class.auto_locked', $class, null, ['members' => $members + 1, 'quota' => $class->quota]);
            Notify::send($class->assistants()->get(), 'class', 'Kelas penuh & terkunci', "{$class->course->name} · {$class->name} mencapai kuota {$class->quota} dan terkunci otomatis.", '/asisten/class/'.$class->id);
        }

        RateLimiter::clear('join-class:'.$user->id);

        return $class;
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['token' => $message]);
    }
}
