<?php

namespace App\Models;

use App\Enums\ApprovalStatus;
use App\Enums\Role;
use App\Support\CourseColor;
use Carbon\CarbonImmutable;
use Database\Factories\CourseFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Mata kuliah praktikum per semester (US-D02, FR-ADM-03).
 *
 * @property int $id
 * @property int $semester_id
 * @property string $code
 * @property string $name
 * @property string|null $color
 * @property int $credits
 * @property int $weight_pretest
 * @property int $weight_posttest
 * @property int $weight_report
 * @property ApprovalStatus $approval_status
 * @property int|null $proposed_by
 * @property int|null $approved_by
 * @property CarbonImmutable|null $approved_at
 * @property string|null $rejection_reason
 * @property-read Semester $semester
 */
#[Fillable(['code', 'name', 'color', 'credits', 'weight_pretest', 'weight_posttest', 'weight_report'])]
class Course extends Model
{
    /** @use HasFactory<CourseFactory> */
    use HasFactory;

    protected $attributes = [
        'approval_status' => 'approved',
    ];

    protected static function booted(): void
    {
        // Warna awal (Figma / warna yang belum dipakai) bila belum dipilih Admin.
        static::creating(fn (Course $course) => $course->color ??= CourseColor::suggest($course));
    }

    protected function casts(): array
    {
        return [
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
     * Asisten pengampu (pivot `course_assistants`).
     *
     * @return BelongsToMany<User, $this>
     */
    public function assistants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'course_assistants')
            ->where('role', Role::Asisten);
    }

    /**
     * @return HasMany<LabClass, $this>
     */
    public function classes(): HasMany
    {
        return $this->hasMany(LabClass::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function proposer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'proposed_by');
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

    /** Mata kuliah di semester arsip ikut read-only. */
    public function isEditable(): bool
    {
        return $this->semester->isEditable();
    }
}
