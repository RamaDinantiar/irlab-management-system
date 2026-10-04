<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Tarif honor asisten per jam beserta riwayatnya (FR-ADM-10).
 *
 * @property int $id
 * @property int $rate_per_hour
 * @property Carbon $effective_from
 * @property int|null $set_by
 */
class HonorRate extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['effective_from' => 'date'];
    }

    /** Tarif yang berlaku pada tanggal tertentu (default Rp25.000 jika belum diatur). */
    public static function rateOn(string $date): int
    {
        return (int) (static::whereDate('effective_from', '<=', $date)->orderByDesc('effective_from')->orderByDesc('id')->value('rate_per_hour') ?? 25000);
    }
}
