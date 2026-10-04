<?php

namespace App\Events;

use App\Models\ShiftSwap;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Pengajuan tukar shift dibuat / dijawab (US-A05-1/2) → notifikasi.
 */
class ShiftSwapChanged
{
    use Dispatchable;

    public function __construct(public readonly ShiftSwap $swap) {}
}
