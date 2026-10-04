<?php

namespace App\Events;

use App\Models\Export;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * US-A04-2: ekspor selesai → notifikasi + tautan unduh.
 */
class ExportFinished
{
    use Dispatchable;

    public function __construct(public readonly Export $export) {}
}
