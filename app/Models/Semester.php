<?php

namespace App\Models;

use App\Enums\SemesterStatus;
use Carbon\CarbonImmutable;
use Database\Factories\SemesterFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Semester akademik (US-D01, FR-ADM-02). Data operasional lain akan memakai
 * `semester_id` dan otomatis terfilter semester aktif.
 *
 * @property int $id
 * @property string $name
 * @property CarbonImmutable $start_date
 * @property CarbonImmutable $end_date
 * @property SemesterStatus $status
 * @property CarbonImmutable|null $activated_at
 * @property CarbonImmutable|null $archived_at
 * @property CarbonImmutable $created_at
 * @property CarbonImmutable $updated_at
 */
#[Fillable(['name', 'start_date', 'end_date'])]
class Semester extends Model
{
    /** @use HasFactory<SemesterFactory> */
    use HasFactory;

    /** US-D01-4: arsip boleh dihapus permanen setelah berumur lebih dari 2 tahun. */
    public const PURGE_AFTER_YEARS = 2;

    protected $attributes = [
        'status' => 'draft',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'status' => SemesterStatus::class,
            'activated_at' => 'datetime',
            'archived_at' => 'datetime',
        ];
    }

    /**
     * @param  Builder<self>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('status', SemesterStatus::Active);
    }

    public static function current(): ?self
    {
        return static::active()->first();
    }

    /** Semester arsip bersifat read-only. */
    public function isEditable(): bool
    {
        return $this->status !== SemesterStatus::Archived;
    }

    public function isPurgeable(): bool
    {
        return $this->status === SemesterStatus::Archived
            && $this->end_date->lt(now()->subYears(self::PURGE_AFTER_YEARS));
    }
}
