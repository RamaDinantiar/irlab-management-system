<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\EnrollmentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Keanggotaan praktikan di kelas (FR-ENR). Dikeluarkan Asisten = soft delete
 * dengan alasan; bergabung lagi lewat token memulihkan baris yang sama.
 *
 * @property int $id
 * @property int $class_id
 * @property int $user_id
 * @property CarbonImmutable $joined_at
 * @property string|null $removed_reason
 * @property int|null $removed_by
 * @property-read LabClass $labClass
 * @property-read User $user
 */
class Enrollment extends Model
{
    /** @use HasFactory<EnrollmentFactory> */
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['joined_at' => 'datetime'];
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
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
