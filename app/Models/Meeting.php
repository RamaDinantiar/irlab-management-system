<?php

namespace App\Models;

use App\Contracts\HasFiles;
use App\Enums\Role;
use Database\Factories\MeetingFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Pertemuan praktikum (FR-AC-04) + modul PDF yang dirilis pada tanggal tertentu.
 *
 * @property int $id
 * @property int $class_id
 * @property int $number
 * @property Carbon $date
 * @property string|null $module_title
 * @property int|null $module_file_id
 * @property Carbon|null $module_release_at
 * @property int|null $responsible_assistant_id
 * @property Carbon|null $started_at
 * @property Carbon|null $ended_at
 * @property-read LabClass $labClass
 * @property-read StoredFile|null $moduleFile
 */
class Meeting extends Model implements HasFiles
{
    /** @use HasFactory<MeetingFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'module_release_at' => 'datetime',
            'started_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }

    /**
     * Sesi berjalan: dimulai hari ini dan belum diakhiri asisten.
     *
     * @param  Builder<self>  $query
     */
    public function scopeRunning(Builder $query): void
    {
        $query->where('started_at', '>=', today())->whereNull('ended_at');
    }

    public function isRunning(): bool
    {
        return $this->started_at !== null && $this->started_at->isToday() && $this->ended_at === null;
    }

    /**
     * @return BelongsTo<LabClass, $this>
     */
    public function labClass(): BelongsTo
    {
        return $this->belongsTo(LabClass::class, 'class_id');
    }

    /**
     * @return BelongsTo<StoredFile, $this>
     */
    public function moduleFile(): BelongsTo
    {
        return $this->belongsTo(StoredFile::class, 'module_file_id');
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

    /** FR-PS-03: modul terlihat praktikan setelah tanggal rilis. */
    public function isModuleReleased(): bool
    {
        return $this->module_file_id !== null
            && ($this->module_release_at === null || $this->module_release_at->isPast());
    }

    public function fileVisibleTo(User $user): bool
    {
        $class = $this->labClass;

        if ($user->role === Role::Asisten) {
            return $class->assistants()->whereKey($user->id)->exists();
        }

        return $this->isModuleReleased()
            && $class->enrollments()->where('user_id', $user->id)->exists();
    }
}
