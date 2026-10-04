<?php

namespace App\Models;

use Database\Factories\RoomFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Ruang lab (PRD 6.1) dengan denah kursi (FR-ADM-05).
 *
 * @property int $id
 * @property string $name
 * @property int $rows
 * @property int $cols
 */
#[Fillable(['name', 'rows', 'cols'])]
class Room extends Model
{
    /** @use HasFactory<RoomFactory> */
    use HasFactory;

    /**
     * @return HasMany<LabClass, $this>
     */
    public function classes(): HasMany
    {
        return $this->hasMany(LabClass::class);
    }

    /**
     * @return HasMany<Seat, $this>
     */
    public function seats(): HasMany
    {
        return $this->hasMany(Seat::class);
    }
}
