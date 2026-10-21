<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Shift mengawas (PRD 6.1). Shift sesi praktikum terkait kelas; shift jaga
 * lab umum tanpa kelas.
 *
 * @property int $id
 * @property int $semester_id
 * @property int $user_id
 * @property int|null $room_id
 * @property int|null $class_id
 * @property CarbonImmutable $date
 * @property string $start_time
 * @property string $end_time
 * @property string|null $title
 * @property-read User $user
 * @property-read Room|null $room
 * @property-read LabClass|null $labClass
 */
class Shift extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['date' => 'date'];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<Room, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * @return BelongsTo<LabClass, $this>
     */
    public function labClass(): BelongsTo
    {
        return $this->belongsTo(LabClass::class, 'class_id');
    }

    /**
     * @return HasMany<ShiftSwap, $this>
     */
    public function swaps(): HasMany
    {
        return $this->hasMany(ShiftSwap::class);
    }

    /**
     * @return HasOne<SupervisionReport, $this>
     */
    public function report(): HasOne
    {
        return $this->hasOne(SupervisionReport::class);
    }

    /**
     * Shift yang belum punya laporan. Sesi kelas cukup dilaporkan sekali oleh
     * salah satu anggota tim (laporan lain di kelas & tanggal yang sama).
     *
     * @param  Builder<self>  $query
     */
    public function scopeUnreported(Builder $query): void
    {
        $query->whereDoesntHave('report')->whereNotExists(fn ($q) => $q->selectRaw('1')->from('supervision_reports as sr')
            ->whereColumn('sr.class_id', 'shifts.class_id')->whereColumn('sr.date', 'shifts.date'));
    }

    public function startClock(): string
    {
        return substr($this->start_time, 0, 5);
    }

    public function endClock(): string
    {
        return substr($this->end_time, 0, 5);
    }

    public function startsAt(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->date->toDateString().' '.$this->startClock());
    }

    public function endsAt(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->date->toDateString().' '.$this->endClock());
    }

    /** Judul tampilan: "Machine Learning · Kelas A" atau "Jaga Lab". */
    public function displayTitle(): string
    {
        return $this->labClass ? "{$this->labClass->course->name} · {$this->labClass->name}" : ($this->title ?? 'Jaga Lab');
    }

    /** Bentrok dengan shift lain milik user yang sama? (FR-AS-03) */
    public static function overlaps(int $userId, string $date, string $start, string $end, ?int $ignoreId = null): bool
    {
        return static::where('user_id', $userId)->whereDate('date', $date)
            ->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId))
            ->where('start_time', '<', $end)->where('end_time', '>', $start)
            ->exists();
    }
}
