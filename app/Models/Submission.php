<?php

namespace App\Models;

use App\Contracts\HasFiles;
use App\Enums\Role;
use Database\Factories\SubmissionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Pengumpulan tugas (US-P02). Setiap kirim ulang = versi baru; hanya
 * `is_current` yang dinilai.
 *
 * @property int $id
 * @property int $task_target_id
 * @property int $user_id
 * @property string|null $text_answer
 * @property Carbon $submitted_at
 * @property bool $is_late
 * @property int $late_minutes
 * @property int $version
 * @property bool $is_current
 * @property string|null $receipt_number
 * @property-read TaskTarget $target
 * @property-read User $user
 * @property-read StoredFile|null $file
 */
class Submission extends Model implements HasFiles
{
    /** @use HasFactory<SubmissionFactory> */
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'is_late' => 'boolean',
            'is_current' => 'boolean',
        ];
    }

    /**
     * @return BelongsTo<TaskTarget, $this>
     */
    public function target(): BelongsTo
    {
        return $this->belongsTo(TaskTarget::class, 'task_target_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return MorphOne<StoredFile, $this>
     */
    public function file(): MorphOne
    {
        return $this->morphOne(StoredFile::class, 'owner')->where('purpose', 'submission');
    }

    /**
     * @return HasOne<Grade, $this>
     */
    public function grade(): HasOne
    {
        return $this->hasOne(Grade::class);
    }

    /**
     * Pemilik submission + asisten pengampu kelasnya.
     */
    public function fileVisibleTo(User $user): bool
    {
        if ($user->id === $this->user_id) {
            return true;
        }

        return in_array($user->role, [Role::Asisten, Role::Admin], true) && $this->target->labClass->isTaughtBy($user);
    }

    /** "Terlambat 2 jam 15 menit". */
    public function lateLabel(): ?string
    {
        if (! $this->is_late) {
            return null;
        }

        $hours = intdiv($this->late_minutes, 60);
        $minutes = $this->late_minutes % 60;

        return 'Terlambat '.trim(($hours ? "{$hours} jam " : '').($minutes ? "{$minutes} menit" : ''));
    }
}
