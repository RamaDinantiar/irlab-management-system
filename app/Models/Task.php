<?php

namespace App\Models;

use App\Contracts\HasFiles;
use App\Enums\Role;
use App\Enums\TaskType;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Tugas (FR-AT): soal rich text (Tiptap JSON), lampiran, pengaturan, target kelas.
 *
 * @property int $id
 * @property int $semester_id
 * @property int $course_id
 * @property TaskType $type
 * @property string $title
 * @property array<string, mixed>|null $body_json
 * @property int $max_score
 * @property bool $allow_late
 * @property string|null $late_penalty
 * @property string|null $late_penalty_unit
 * @property list<string> $allowed_formats
 * @property string $text_answer
 * @property string $status
 * @property int|null $meeting_number
 * @property int|null $created_by
 * @property-read Course $course
 */
class Task extends Model implements HasFiles
{
    /** @use HasFactory<TaskFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'type' => TaskType::class,
            'body_json' => 'array',
            'allowed_formats' => 'array',
            'allow_late' => 'boolean',
            'max_score' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return BelongsTo<Semester, $this>
     */
    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    /**
     * @return HasMany<TaskTarget, $this>
     */
    public function targets(): HasMany
    {
        return $this->hasMany(TaskTarget::class);
    }

    /**
     * Lampiran soal (FR-AT-02).
     *
     * @return MorphMany<StoredFile, $this>
     */
    public function attachments(): MorphMany
    {
        return $this->morphMany(StoredFile::class, 'owner')->where('purpose', 'task_attachment');
    }

    public function isPublished(): bool
    {
        return $this->status === 'published';
    }

    /** Asisten pengampu mata kuliah (Ampu). */
    public function isManagedBy(User $user): bool
    {
        return $user->role === Role::Admin
            || $this->course->assistants()->whereKey($user->id)->exists();
    }

    public function isEditable(): bool
    {
        return $this->semester->isEditable();
    }

    /**
     * Lampiran terlihat praktikan anggota kelas target yang sudah terbuka.
     */
    public function fileVisibleTo(User $user): bool
    {
        if ($user->role === Role::Asisten) {
            return $this->isManagedBy($user);
        }

        return $this->isPublished() && $this->targets()
            ->whereNotNull('open_at')->where('open_at', '<=', now())
            ->whereHas('labClass.enrollments', fn ($q) => $q->where('user_id', $user->id))
            ->exists();
    }
}
