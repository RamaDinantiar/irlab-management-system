<?php

namespace App\Models;

use Database\Factories\SeatContractFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Kontrak kursi praktikan untuk satu kelas selama satu semester (US-P04).
 * Nama/NIM/jurusan disalin saat kontrak agar riwayat tetap utuh.
 *
 * @property int $id
 * @property int $class_id
 * @property int $seat_id
 * @property int $user_id
 * @property string $snapshot_name
 * @property string $snapshot_nim
 * @property string|null $snapshot_major
 * @property-read LabClass $labClass
 * @property-read Seat $seat
 * @property-read User $user
 */
class SeatContract extends Model
{
    /** @use HasFactory<SeatContractFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    /**
     * @return BelongsTo<LabClass, $this>
     */
    public function labClass(): BelongsTo
    {
        return $this->belongsTo(LabClass::class, 'class_id');
    }

    /**
     * @return BelongsTo<Seat, $this>
     */
    public function seat(): BelongsTo
    {
        return $this->belongsTo(Seat::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
