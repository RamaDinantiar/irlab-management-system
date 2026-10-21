<?php

namespace App\Models;

use App\Contracts\HasFiles;
use Carbon\CarbonImmutable;
use Database\Factories\SupervisionReportFactory;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Berita acara mengawas (US-A03, FR-AR). Draft → Diajukan → Diverifikasi
 * atau Dikembalikan. Hanya yang Diverifikasi masuk rekap & honor.
 *
 * @property int $id
 * @property int $semester_id
 * @property int|null $shift_id
 * @property int $user_id
 * @property int|null $class_id
 * @property int|null $room_id
 * @property CarbonImmutable $date
 * @property string $start_time
 * @property string $end_time
 * @property string $activity
 * @property string|null $material
 * @property int|null $present_count Tidak lagi diisi (data lama).
 * @property string|null $lab_condition Tidak lagi diisi (data lama).
 * @property string $notes
 * @property string $status
 * @property CarbonImmutable|null $submitted_at
 * @property int|null $verified_by
 * @property CarbonImmutable|null $verified_at
 * @property string|null $return_note
 * @property CarbonImmutable $editable_until
 * @property-read User $user
 * @property-read LabClass|null $labClass
 * @property-read Room|null $room
 * @property-read Shift|null $shift
 * @property-read Collection<int, User&object{pivot: SupervisionReportAssistant}> $assistants
 */
class SupervisionReport extends Model implements HasFiles
{
    /** @use HasFactory<SupervisionReportFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'submitted_at' => 'datetime',
            'verified_at' => 'datetime',
            'editable_until' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /**
     * Tim asisten jaga, urut posisi (1 = Lead).
     *
     * @return BelongsToMany<User, $this, SupervisionReportAssistant, 'pivot'>
     */
    public function assistants(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'supervision_report_assistants')->using(SupervisionReportAssistant::class)->withPivot('position')->orderByPivot('position');
    }

    /**
     * @return BelongsTo<LabClass, $this>
     */
    public function labClass(): BelongsTo
    {
        return $this->belongsTo(LabClass::class, 'class_id');
    }

    /**
     * @return BelongsTo<Room, $this>
     */
    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /**
     * @return BelongsTo<Shift, $this>
     */
    public function shift(): BelongsTo
    {
        return $this->belongsTo(Shift::class);
    }

    /**
     * @return MorphMany<StoredFile, $this>
     */
    public function photos(): MorphMany
    {
        return $this->morphMany(StoredFile::class, 'owner')->where('purpose', 'report_photo');
    }

    /** US-A03-4: terkunci setelah H+1 23.59 (kecuali dibuka Admin). */
    public function isLocked(): bool
    {
        return now()->greaterThan($this->editable_until);
    }

    /** Pembuat dapat mengubah selama belum terkunci dan belum diverifikasi. */
    public function isEditableBy(User $user): bool
    {
        return $this->user_id === $user->id && $this->status !== 'verified' && ! $this->isLocked();
    }

    public function hours(): float
    {
        [$sh, $sm] = array_map('intval', explode(':', $this->start_time));
        [$eh, $em] = array_map('intval', explode(':', $this->end_time));

        return round(max(0, ($eh * 60 + $em) - ($sh * 60 + $sm)) / 60, 2);
    }

    public function fileVisibleTo(User $user): bool
    {
        return $user->canVerifyReports() || $user->canApproveHonor()
            || $this->user_id === $user->id
            || $this->assistants()->whereKey($user->id)->exists();
    }
}
