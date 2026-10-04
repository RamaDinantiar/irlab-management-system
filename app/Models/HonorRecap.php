<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Rekap honor bulanan per asisten (FR-AGN-03). Draft → Final setelah disetujui Bendahara.
 *
 * @property int $id
 * @property string $month
 * @property int $user_id
 * @property int $total_shifts
 * @property string $total_hours
 * @property int $rate_per_hour
 * @property int $amount
 * @property string $status
 * @property int|null $approved_by
 * @property Carbon|null $approved_at
 * @property-read User $user
 */
class HonorRecap extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['approved_at' => 'datetime'];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
