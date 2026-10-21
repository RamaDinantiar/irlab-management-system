<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\MeetingFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Pertemuan praktikum (FR-AC-04). Modul dipegang dosen dan tidak dibagikan
 * lewat website; pertemuan hanya mencatat topiknya.
 *
 * @property int $id
 * @property int $class_id
 * @property int $number
 * @property CarbonImmutable $date
 * @property string|null $topic
 * @property int|null $responsible_assistant_id
 * @property CarbonImmutable|null $started_at
 * @property CarbonImmutable|null $ended_at
 * @property-read LabClass $labClass
 * @property-read User|null $responsibleAssistant
 */
class Meeting extends Model
{
    /** @use HasFactory<MeetingFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    /**
     * Sesi berjalan otomatis mengikuti jam kelas pada tanggal pertemuan,
     * kecuali diakhiri lebih awal oleh asisten (ended_at).
     *
     * @param  Builder<self>  $query
     */
    public function scopeRunning(Builder $query): void
    {
        $time = now()->format('H:i:s');

        $query->whereDate('date', today())->whereNull('ended_at')
            ->whereHas('labClass', fn ($q) => $q->where('start_time', '<=', $time)->where('end_time', '>', $time));
    }

    public function startsAt(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->date->toDateString().' '.$this->labClass->start_time);
    }

    public function endsAt(): CarbonImmutable
    {
        return CarbonImmutable::parse($this->date->toDateString().' '.$this->labClass->end_time);
    }

    public function isRunning(): bool
    {
        return $this->ended_at === null && now()->betweenIncluded($this->startsAt(), $this->endsAt()->subSecond());
    }

    /** Jam mulai sudah lewat (sesi sedang/sudah berlangsung). */
    public function hasStarted(): bool
    {
        return $this->started_at !== null || now()->gte($this->startsAt());
    }

    /**
     * @return BelongsTo<LabClass, $this>
     */
    public function labClass(): BelongsTo
    {
        return $this->belongsTo(LabClass::class, 'class_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function responsibleAssistant(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsible_assistant_id');
    }

    /**
     * @return HasMany<Attendance, $this>
     */
    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }
}
