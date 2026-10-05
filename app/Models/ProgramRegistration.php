<?php

namespace App\Models;

use App\Contracts\HasFiles;
use App\Enums\Role;
use Database\Factories\ProgramRegistrationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Pendaftaran program oleh akun Praktikan (FR-PP-02/03).
 *
 * @property int $id
 * @property int $program_id
 * @property int $user_id
 * @property array<string, mixed>|null $answers_json
 * @property int|null $current_stage_id
 * @property string $status
 * @property array<string, array{result: string, note: ?string, by: ?string, at: string}>|null $stage_results
 * @property bool $attended
 * @property-read Program $program
 * @property-read User $user
 * @property-read ProgramStage|null $currentStage
 */
class ProgramRegistration extends Model implements HasFiles
{
    /** @use HasFactory<ProgramRegistrationFactory> */
    use HasFactory;

    public const STATUS_LABELS = [
        'registered' => 'Terdaftar',
        'passed_docs' => 'Lolos Berkas',
        'testing' => 'Tes',
        'accepted' => 'Diterima',
        'rejected' => 'Ditolak',
        'cancelled' => 'Dibatalkan',
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['answers_json' => 'array', 'stage_results' => 'array', 'attended' => 'boolean'];
    }

    /**
     * @return BelongsTo<Program, $this>
     */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<ProgramStage, $this>
     */
    public function currentStage(): BelongsTo
    {
        return $this->belongsTo(ProgramStage::class, 'current_stage_id');
    }

    /**
     * @return MorphMany<StoredFile, $this>
     */
    public function files(): MorphMany
    {
        return $this->morphMany(StoredFile::class, 'owner');
    }

    public function fileVisibleTo(User $user): bool
    {
        return $this->user_id === $user->id || $user->role === Role::Asisten;
    }
}
