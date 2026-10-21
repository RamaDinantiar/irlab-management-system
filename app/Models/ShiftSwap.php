<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pengajuan tukar shift (US-A05, FR-AS-03/04). Status: pending (Diajukan),
 * approved, rejected, expired, cancelled.
 *
 * @property int $id
 * @property int $shift_id
 * @property int $from_user_id
 * @property int $to_user_id
 * @property string $reason
 * @property string $status
 * @property string|null $response_note
 * @property CarbonImmutable|null $responded_at
 * @property-read Shift $shift
 * @property-read User $fromUser
 * @property-read User $toUser
 */
class ShiftSwap extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['responded_at' => 'datetime'];
    }

    /**
     * @return BelongsTo<Shift, $this>
     */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function fromUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'from_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function toUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'to_user_id');
    }
}
