<?php

namespace App\Actions\Enrollment;

use App\Actions\User\ImportUsers;
use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

/**
 * FR-AC-03: import praktikan ke kelas via Excel/CSV (kolom `nim`). Akun harus
 * sudah dibuat Admin; baris gagal dilaporkan per nomor baris.
 */
class ImportMembers
{
    public function __construct(private readonly ImportUsers $reader) {}

    /**
     * @return array{created: int, failed: list<array{row: int, nim: string|null, errors: list<string>}>, total: int}
     */
    public function __invoke(LabClass $class, UploadedFile $file): array
    {
        $rows = $this->reader->readRows($file, ['nim']);
        $added = 0;
        $failed = [];

        DB::transaction(function () use ($class, $rows, &$added, &$failed) {
            $class = LabClass::lockForUpdate()->with('course')->findOrFail($class->id);
            $members = $class->enrollments()->count();

            foreach ($rows as $rowNumber => $row) {
                $nim = $row['nim'] ?: null;
                $user = $nim ? User::where('nim', $nim)->first() : null;
                $error = match (true) {
                    ! $nim => 'NIM kosong.',
                    ! $user => 'Akun dengan NIM ini belum ada. Minta Admin membuat akun terlebih dahulu.',
                    $user->role !== Role::Praktikan => 'Akun ini bukan praktikan.',
                    $class->enrollments()->where('user_id', $user->id)->exists() => 'Sudah menjadi anggota kelas ini.',
                    Enrollment::where('user_id', $user->id)->whereHas('labClass', fn ($q) => $q->where('course_id', $class->course_id)->whereKeyNot($class->id))->exists() => "Sudah terdaftar di kelas lain mata kuliah {$class->course->name}.",
                    $members >= $class->quota => "Kuota kelas ({$class->quota}) penuh.",
                    default => null,
                };

                if ($error) {
                    $failed[] = ['row' => (int) $rowNumber, 'nim' => $nim, 'errors' => [$error]];

                    continue;
                }

                $existing = Enrollment::withTrashed()->where('class_id', $class->id)->where('user_id', $user->id)->first();
                if ($existing) {
                    $existing->restore();
                    $existing->forceFill(['joined_at' => now(), 'removed_reason' => null, 'removed_by' => null])->save();
                } else {
                    Enrollment::create(['class_id' => $class->id, 'user_id' => $user->id, 'joined_at' => now()]);
                }
                $members++;
                $added++;
            }

            AuditLog::record('enrollment.imported', $class, null, ['added' => $added, 'failed' => count($failed)]);
        });

        return ['created' => $added, 'failed' => $failed, 'total' => count($rows)];
    }
}
