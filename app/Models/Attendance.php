<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Presensi praktikan per pertemuan: hadir / izin / sakit / alfa (FR-AD-01).
 *
 * @property int $id
 * @property int $meeting_id
 * @property int $user_id
 * @property string $status
 */
class Attendance extends Model
{
    public const STATUSES = ['hadir', 'izin', 'sakit', 'alfa'];

    protected $guarded = ['id'];

    /**
     * @return BelongsTo<Meeting, $this>
     */
    public function meeting(): BelongsTo
    {
        return $this->belongsTo(Meeting::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
