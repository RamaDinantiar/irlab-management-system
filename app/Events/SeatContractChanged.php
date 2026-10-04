<?php

namespace App\Events;

use App\Models\SeatContract;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * US-D03-3: kontrak kursi dipindah/dibatalkan Admin → notifikasi praktikan.
 */
class SeatContractChanged
{
    use Dispatchable;

    /**
     * @param  'moved'|'cancelled'  $change
     */
    public function __construct(public readonly SeatContract $contract, public readonly string $change, public readonly string $reason) {}
}
