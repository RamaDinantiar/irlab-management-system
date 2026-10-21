<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\GradeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Nilai & feedback satu submission (US-A02, FR-AG). Hanya status `published`
 * yang terlihat praktikan (US-P03).
 *
 * @property int $id
 * @property int $submission_id
 * @property string|null $score
 * @property string|null $feedback
 * @property int|null $graded_by
 * @property CarbonImmutable|null $graded_at
 * @property string $status
 * @property CarbonImmutable|null $published_at
 * @property int $version
 * @property-read Submission $submission
 * @property-read User|null $grader
 */
class Grade extends Model
{
    /** @use HasFactory<GradeFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'graded_at' => 'datetime',
            'published_at' => 'datetime',
            'version' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Submission, $this>
     */
    public function submission(): BelongsTo
    {
        return $this->belongsTo(Submission::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function grader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'graded_by');
    }

    public function isPublished(): bool
    {
        return $this->status === 'published';
    }
}
