<?php

namespace App\Events;

use App\Models\TaskTarget;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Nilai satu tugas di satu kelas dipublikasikan (FR-AG-05) → notifikasi ke praktikan.
 */
class GradesPublished
{
    use Dispatchable;

    /**
     * @param  array<int, int>  $userIds
     */
    public function __construct(public readonly TaskTarget $target, public readonly array $userIds) {}
}
