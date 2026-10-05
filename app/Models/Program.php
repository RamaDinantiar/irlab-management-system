<?php

namespace App\Models;

use App\Contracts\HasFiles;
use App\Enums\ProgramType;
use Database\Factories\ProgramFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Program lab (FR-APR): Workshop, Quick Tutor, Rekrutmen Asisten, Maintenance.
 *
 * @property int $id
 * @property ProgramType $type
 * @property string $title
 * @property string|null $category
 * @property string|null $description
 * @property string|null $speaker_name
 * @property string|null $speaker_affiliation
 * @property string $mode
 * @property string|null $location
 * @property int|null $room_id
 * @property Carbon|null $starts_at
 * @property Carbon|null $ends_at
 * @property int|null $quota
 * @property int|null $fee_internal
 * @property int|null $fee_external
 * @property list<string>|null $facilities
 * @property list<string>|null $requirements
 * @property int|null $poster_file_id
 * @property string $status
 * @property Carbon|null $opens_at
 * @property Carbon|null $closes_at
 * @property list<int>|null $staff_ids
 * @property string|null $result_notes
 * @property-read StoredFile|null $poster
 */
class Program extends Model implements HasFiles
{
    /** @use HasFactory<ProgramFactory> */
    use HasFactory;

    public const STATUS_LABELS = [
        'draft' => 'Persiapan',
        'open' => 'Pendaftaran Dibuka',
        'closed' => 'Pendaftaran Ditutup',
        'finished' => 'Selesai',
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'type' => ProgramType::class,
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'opens_at' => 'datetime',
            'closes_at' => 'datetime',
            'facilities' => 'array',
            'requirements' => 'array',
            'staff_ids' => 'array',
        ];
    }

    /**
     * @return HasMany<ProgramStage, $this>
     */
    public function stages(): HasMany
    {
        return $this->hasMany(ProgramStage::class)->orderBy('order');
    }

    /**
     * @return HasMany<ProgramFormField, $this>
     */
    public function fields(): HasMany
    {
        return $this->hasMany(ProgramFormField::class)->orderBy('order');
    }

    /**
     * @return HasMany<ProgramRegistration, $this>
     */
    public function registrations(): HasMany
    {
        return $this->hasMany(ProgramRegistration::class);
    }

    /**
     * @return BelongsTo<StoredFile, $this>
     */
    public function poster(): BelongsTo
    {
        return $this->belongsTo(StoredFile::class, 'poster_file_id');
    }

    /**
     * @return BelongsTo<Room, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Program yang bisa dilihat praktikan di etalase (FR-PP-01).
     *
     * @param  Builder<self>  $query
     */
    public function scopeCatalog(Builder $query): void
    {
        $query->where('type', '!=', ProgramType::Maintenance)->whereIn('status', ['open', 'closed', 'finished']);
    }

    /** Pendaftaran sedang dibuka (status open + dalam rentang tanggal). */
    public function isAcceptingRegistrations(): bool
    {
        return $this->status === 'open'
            && (! $this->opens_at || $this->opens_at->isPast())
            && (! $this->closes_at || $this->closes_at->isFuture());
    }

    public function isFull(): bool
    {
        return $this->quota !== null && $this->registrations()->where('status', '!=', 'cancelled')->count() >= $this->quota;
    }

    /**
     * FR-APR-03-4: checklist kesiapan rekrutmen.
     *
     * @return list<array{key: string, label: string, done: bool}>
     */
    public function readiness(): array
    {
        $stages = $this->stages()->get();
        $items = [
            ['key' => 'description', 'label' => 'Judul & deskripsi diisi', 'done' => filled($this->description)],
            ['key' => 'period', 'label' => 'Periode pendaftaran ditetapkan', 'done' => $this->opens_at !== null && $this->closes_at !== null],
            ['key' => 'timeline', 'label' => 'Timeline minimal 2 tahap, semua bertanggal', 'done' => $stages->count() >= 2 && $stages->every(fn ($s) => $s->start_at && $s->end_at)],
            ['key' => 'form', 'label' => 'Form pendaftaran memiliki field', 'done' => $this->fields()->exists()],
        ];

        if ($this->type === ProgramType::Recruitment) {
            $items[] = ['key' => 'requirements', 'label' => 'Persyaratan kualifikasi diisi', 'done' => ! empty($this->requirements)];
        }

        return $items;
    }

    public function isReady(): bool
    {
        return collect($this->readiness())->every(fn ($i) => $i['done']);
    }

    public function fileVisibleTo(User $user): bool
    {
        return true; // poster publik bagi pengguna yang login
    }
}
