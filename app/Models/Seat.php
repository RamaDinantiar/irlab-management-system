<?php

namespace App\Models;

use Database\Factories\SeatFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Sel denah ruang lab (FR-ADM-05): kursi, meja asisten, atau nonaktif.
 * Posisi tanpa baris = lorong.
 *
 * @property int $id
 * @property int $room_id
 * @property string|null $label
 * @property int $row
 * @property int $col
 * @property string $type
 * @property-read Room $room
 */
class Seat extends Model
{
    /** @use HasFactory<SeatFactory> */
    use HasFactory;

    public const TYPES = ['seat', 'assistant_desk', 'aisle', 'disabled'];

    protected $guarded = ['id'];

    /**
     * @return BelongsTo<Room, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * @return HasMany<SeatContract, $this>
     */
    public function contracts(): HasMany
    {
        return $this->hasMany(SeatContract::class);
    }

    public function isSeat(): bool
    {
        return $this->type === 'seat';
    }
}
