<?php

namespace App\Models;

use App\Enums\ApprovalStatus;
use App\Enums\Role;
use Database\Factories\LabClassFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Kelas praktikum (US-A01, US-D02). Disebut LabClass karena `Class` adalah kata
 * kunci PHP; tabelnya tetap `classes` sesuai PRD 6.1.
 *
 * @property int $id
 * @property int $semester_id
 * @property int $course_id
 * @property string $name
 * @property int $day_of_week
 * @property string $start_time
 * @property string $end_time
 * @property int $room_id
 * @property int $quota
 * @property string|null $join_token
 * @property bool $is_locked
 * @property bool $seat_contract_open
 * @property ApprovalStatus $approval_status
 * @property int|null $proposed_by
 * @property int|null $approved_by
 * @property Carbon|null $approved_at
 * @property string|null $rejection_reason
 * @property-read Semester $semester
 * @property-read Course $course
 * @property-read Room $room
 */
#[Fillable(['course_id', 'name', 'day_of_week', 'start_time', 'end_time', 'room_id', 'quota'])]
class LabClass extends Model
{
    /** @use HasFactory<LabClassFactory> */
    use HasFactory;

    protected $table = 'classes';

    protected $attributes = [
        'approval_status' => 'approved',
        'is_locked' => false,
        'seat_contract_open' => false,
    ];

    protected function casts(): array
    {
        return [
            'day_of_week' => 'integer',
            'quota' => 'integer',
            'is_locked' => 'boolean',
            'seat_contract_open' => 'boolean',
            'approval_status' => ApprovalStatus::class,
            'approved_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Semester, $this>
     */
    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    /**
     * @return BelongsTo<Course, $this>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * @return BelongsTo<Room, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function proposer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'proposed_by');
    }

    /**
     * Pertemuan 1–n (FR-AC-04).
     *
     * @return HasMany<Meeting, $this>
     */
    public function meetings(): HasMany
    {
        return $this->hasMany(Meeting::class, 'class_id')->orderBy('number');
    }

    /** Asisten pengampu kelas ini? Admin = superset (FR-ADM-11). */
    public function isTaughtBy(User $user): bool
    {
        return $user->isAdmin() || $this->assistants()->whereKey($user->id)->exists();
    }

    /**
     * Kelas yang diampu user; Admin melihat semua kelas (FR-ADM-11).
     *
     * @param  Builder<self>  $query
     */
    public function scopeTaughtBy(Builder $query, User $user): void
    {
        $query->when(! $user->isAdmin(), fn ($q) => $q->whereHas('assistants', fn ($a) => $a->whereKey($user->id)));
    }

    /**
     * @return HasMany<Announcement, $this>
     */
    public function announcements(): HasMany
    {
        return $this->hasMany(Announcement::class, 'class_id');
    }

    /**
     * @return HasMany<SeatContract, $this>
     */
    public function seatContracts(): HasMany
    {
        return $this->hasMany(SeatContract::class, 'class_id');
    }

    /**
     * Keanggotaan aktif (yang dikeluarkan ter-soft-delete).
     *
     * @return HasMany<Enrollment, $this>
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class, 'class_id');
    }

    /**
     * @return BelongsToMany<User, $this>
     */
    public function assistants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'class_assistants', 'class_id')
            ->where('role', Role::Asisten);
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeForSemester(Builder $query, Semester|int $semester): void
    {
        $query->where('semester_id', $semester instanceof Semester ? $semester->id : $semester);
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopePending(Builder $query): void
    {
        $query->where('approval_status', ApprovalStatus::Pending);
    }

    /**
     * Kelas yang jamnya tumpang tindih di hari yang sama (start < end lain DAN end > start lain).
     *
     * @param  Builder<self>  $query
     */
    public function scopeOverlapping(Builder $query, int $day, string $start, string $end): void
    {
        $query->where('day_of_week', $day)
            ->where('start_time', '<', $end)
            ->where('end_time', '>', $start)
            ->where('approval_status', '!=', ApprovalStatus::Rejected);
    }

    public function isEditable(): bool
    {
        return $this->semester->isEditable();
    }

    /** "07:20:00" → "07:20". */
    public function startClock(): string
    {
        return substr($this->start_time, 0, 5);
    }

    public function endClock(): string
    {
        return substr($this->end_time, 0, 5);
    }
}
