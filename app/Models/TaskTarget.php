<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\TaskTargetFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Tugas untuk satu kelas (FR-AT-03) dengan jendela buka & tenggat sendiri.
 *
 * @property int $id
 * @property int $task_id
 * @property int $class_id
 * @property int|null $meeting_id
 * @property Carbon|null $open_at
 * @property Carbon|null $due_at
 * @property Carbon|null $closed_at
 * @property int|null $window_minutes
 * @property Carbon|null $published_at
 * @property-read Task $task
 * @property-read LabClass $labClass
 */
class TaskTarget extends Model
{
    /** @use HasFactory<TaskTargetFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'open_at' => 'datetime',
            'due_at' => 'datetime',
            'closed_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Task, $this>
     */
    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    /**
     * @return BelongsTo<LabClass, $this>
     */
    public function labClass(): BelongsTo
    {
        return $this->belongsTo(LabClass::class, 'class_id');
    }

    /**
     * @return BelongsTo<Meeting, $this>
     */
    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    /**
     * @return HasMany<Submission, $this>
     */
    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }

    /**
     * FR-AT-05: Draft · Terjadwal · Terbuka · Ditutup.
     *
     * @return 'draft'|'scheduled'|'open'|'closed'
     */
    public function state(?CarbonInterface $now = null): string
    {
        $now ??= now();

        if (! $this->task->isPublished()) {
            return 'draft';
        }

        if ($this->open_at === null || $this->open_at->isAfter($now)) {
            return 'scheduled';
        }

        // Dihentikan manual oleh asisten ("Berhenti") — terlambat pun ditolak.
        if ($this->closed_at !== null && ! $this->closed_at->isAfter($now)) {
            return 'closed';
        }

        if ($this->due_at !== null && $this->due_at->isBefore($now) && ! $this->task->allow_late) {
            return 'closed';
        }

        return 'open';
    }

    public function isPastDue(?CarbonInterface $now = null): bool
    {
        return $this->due_at !== null && $this->due_at->isBefore($now ?? now());
    }
}
