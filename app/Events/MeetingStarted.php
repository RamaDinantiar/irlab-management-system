<?php

namespace App\Events;

use App\Models\Meeting;
use App\Models\User;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * FR-AD-01: sesi pertemuan dimulai otomatis pada jam mulai kelas. Listener
 * membuka Pre-test yang dijadwalkan untuk sesi ini.
 */
class MeetingStarted
{
    use Dispatchable;

    public function __construct(public readonly Meeting $meeting, public readonly ?User $assistant = null) {}
}
