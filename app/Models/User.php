<?php

namespace App\Models;

use App\Enums\Position;
use App\Enums\Role;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string|null $nim
 * @property string $name
 * @property string $email
 * @property Role $role
 * @property Position $position
 * @property string|null $major
 * @property int|null $cohort_year
 * @property bool $is_active
 * @property bool $must_change_password
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['nim', 'name', 'email', 'password', 'major', 'cohort_year'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Nilai bawaan — sama dengan default kolom di database, agar model baru
     * (sebelum di-refresh) tidak dianggap nonaktif oleh EnsureUserIsActive.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'role' => 'praktikan',
        'position' => 'none',
        'is_active' => true,
        'must_change_password' => false,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    /**
     * Mata kuliah yang diampu (Asisten).
     *
     * @return BelongsToMany<Course, $this>
     */
    public function courses(): BelongsToMany
    {
        return $this->belongsToMany(Course::class, 'course_assistants');
    }

    /**
     * Kelas yang diampu (Asisten).
     *
     * @return BelongsToMany<LabClass, $this>
     */
    public function classes(): BelongsToMany
    {
        return $this->belongsToMany(LabClass::class, 'class_assistants', 'user_id', 'class_id');
    }

    /**
     * Keanggotaan kelas (Praktikan).
     *
     * @return HasMany<Enrollment, $this>
     */
    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    /** FR-AR-05: Sekretaris memverifikasi laporan ngawas (Admin juga boleh). */
    public function canVerifyReports(): bool
    {
        return $this->isAdmin() || $this->position === Position::Sekretaris;
    }

    /** FR-AGN-03: Bendahara menyetujui rekap honor (Admin juga boleh). */
    public function canApproveHonor(): bool
    {
        return $this->isAdmin() || $this->position === Position::Bendahara;
    }

    public function isAdmin(): bool
    {
        return $this->role === Role::Admin;
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
            'position' => Position::class,
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
        ];
    }
}
