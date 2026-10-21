<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tarif honor asisten per jam beserta riwayatnya (FR-ADM-10).
 *
 * @property int $id
 * @property int $rate_per_hour
 * @property CarbonImmutable $effective_from
 * @property int|null $set_by
 */
class HonorRate extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['effective_from' => 'date'];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function setter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'set_by');
    }

    /** Tarif yang berlaku pada tanggal tertentu (default Rp25.000 jika belum diatur). */
    public static function rateOn(string $date): int
    {
        return (int) (static::whereDate('effective_from', '<=', $date)->orderByDesc('effective_from')->orderByDesc('id')->value('rate_per_hour') ?? 25000);
    }
}
