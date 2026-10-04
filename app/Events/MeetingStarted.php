<?php

namespace App\Events;

use App\Models\Meeting;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * FR-AD-01 "Mulai Sesi Kelas": pertemuan dimulai. Listener membuka Pre-test
 * yang dijadwalkan untuk sesi ini dan menyiapkan draft laporan ngawas.
 */
class MeetingStarted
{
    use Dispatchable;

    public function __construct(public readonly Meeting $meeting, public readonly User $assistant) {}
}
