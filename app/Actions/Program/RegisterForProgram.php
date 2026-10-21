<?php

namespace App\Actions\Program;

use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\Program;
use App\Models\ProgramFormField;
use App\Models\ProgramRegistration;
use App\Models\User;
use App\Support\Files\FileStore;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * FR-PP-02: pendaftaran program sesuai form buatan asisten. Hanya akun
 * Praktikan (FR-APR-03); kuota dijaga dengan lockForUpdate.
 */
class RegisterForProgram
{
    /** Format file yang dikenal FileStore. */
    private const KINDS = ['pdf' => 'pdf', 'zip' => 'zip', 'jpg' => 'image', 'jpeg' => 'image', 'png' => 'image'];

    public function __construct(private FileStore $files) {}

    /**
     * @param  array<int|string, mixed>  $answers  field_id → nilai
     * @param  array<int|string, UploadedFile>  $uploads  field_id → file
     */
    public function __invoke(User $user, Program $program, array $answers, array $uploads): ProgramRegistration
    {
        abort_unless($user->role === Role::Praktikan, 403, 'Pendaftaran program hanya untuk akun Praktikan.');

        if (! $program->type->acceptsRegistrations() || ! $program->isAcceptingRegistrations()) {
            $this->fail('program', 'Pendaftaran program ini sedang tidak dibuka.');
        }

        $fields = $program->fields()->get();
        $clean = $this->validate($fields, $answers, $uploads);

        return DB::transaction(function () use ($user, $program, $clean, $fields, $uploads) {
            $locked = Program::lockForUpdate()->findOrFail($program->id);

            if (ProgramRegistration::where('program_id', $locked->id)->where('user_id', $user->id)->exists()) {
                $this->fail('program', 'Anda sudah terdaftar di program ini.');
            }

            if ($locked->isFull()) {
                $this->fail('program', 'Kuota program sudah penuh.');
            }

            $registration = ProgramRegistration::create([
                'program_id' => $locked->id,
                'user_id' => $user->id,
                'answers_json' => $clean,
                'current_stage_id' => $locked->stages()->value('id'),
                'status' => 'registered',
            ]);

            $answers = $clean;
            foreach ($fields->where('type', 'file') as $field) {
                if ($upload = $uploads[(string) $field->id] ?? null) {
                    $rules = $field->rules_json ?? [];
                    $kinds = array_values(array_unique(array_map(fn ($f) => self::KINDS[$f], $rules['formats'] ?? ['pdf'])));
                    $file = $this->files->store($upload, $kinds, 'program_answer', $registration, $user, "answers.{$field->id}", isset($rules['max_mb']) ? (int) $rules['max_mb'] * 1024 : null);
                    $answers[(string) $field->id] = ['file_id' => $file->id, 'name' => $file->original_name];
                }
            }

            $registration->update(['answers_json' => $answers]);
            AuditLog::record('program.registered', $registration, null, ['program_id' => $locked->id]);

            return $registration;
        });
    }

    /**
     * @param  Collection<int, ProgramFormField>  $fields
     *                                                     Kunci = ID field (string angka dari form otomatis menjadi int di PHP).
     * @param  array<int|string, mixed>  $answers
     * @param  array<int|string, UploadedFile>  $uploads
     * @return array<int|string, mixed>
     */
    private function validate($fields, array $answers, array $uploads): array
    {
        $errors = [];
        $clean = [];

        foreach ($fields as $field) {
            $key = (string) $field->id;
            if ($field->type === 'file') {
                $upload = $uploads[$key] ?? null;

                if ($upload === null) {
                    if ($field->required) {
                        $errors["answers.{$key}"] = "{$field->label} wajib diisi.";
                    }

                    continue;
                }

                $formats = $field->rules_json['formats'] ?? ['pdf'];
                if (! in_array(strtolower($upload->getClientOriginalExtension()), $formats, true)) {
                    $errors["answers.{$key}"] = "{$field->label}: format harus ".strtoupper(implode(', ', $formats)).'.';
                }

                continue;
            }

            $value = trim((string) ($answers[$key] ?? ''));

            if ($field->required && $value === '') {
                $errors["answers.{$key}"] = "{$field->label} wajib diisi.";

                continue;
            }

            if ($value === '') {
                continue;
            }

            if ($field->type === 'number' && ! is_numeric($value)) {
                $errors["answers.{$key}"] = "{$field->label} harus berupa angka.";
            } elseif ($field->type === 'select' && ! in_array($value, $field->options ?? [], true)) {
                $errors["answers.{$key}"] = "Pilihan {$field->label} tidak valid.";
            } elseif (mb_strlen($value) > ($field->type === 'textarea' ? 3000 : 255)) {
                $errors["answers.{$key}"] = "{$field->label} terlalu panjang.";
            } else {
                $clean[$key] = $field->type === 'number' ? $value + 0 : $value;
            }
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        return $clean;
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
