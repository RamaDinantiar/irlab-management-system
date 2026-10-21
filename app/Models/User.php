<?php

namespace App\Models;

use App\Enums\Position;
use App\Enums\Role;
use Carbon\CarbonImmutable;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * @property int $id
 * @property string|null $nim
 * @property string $name
 * @property string $email
 * @property string|null $phone
 * @property int|null $avatar_file_id
 * @property-read string|null $avatar
 * @property Role $role
 * @property Position $position
 * @property string|null $major
 * @property int|null $cohort_year
 * @property bool $is_active
 * @property bool $must_change_password
 * @property CarbonImmutable|null $email_verified_at
 * @property string $password
 * @property string|null $remember_token
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['nim', 'name', 'email', 'phone', 'password', 'major', 'cohort_year'])]
#[Appends(['avatar'])]
#[Hidden(['avatar_file_id', 'password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
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
     * Foto profil (disk privat, dikelola dari Pengaturan Akun › Profil).
     *
     * @return BelongsTo<StoredFile, $this>
     */
    public function avatarFile(): BelongsTo
    {
        return $this->belongsTo(StoredFile::class, 'avatar_file_id');
    }

    /**
     * URL foto profil; `v` = id file agar cache browser ikut berganti.
     *
     * @return Attribute<string|null, never>
     */
    protected function avatar(): Attribute
    {
        return Attribute::get(fn () => $this->avatar_file_id
            ? route('avatars.show', ['user' => $this->id, 'v' => $this->avatar_file_id])
            : null);
    }

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

    /** FR-AR-05: Sekretaris/Bendahara memverifikasi laporan ngawas (Admin juga boleh). */
    public function canVerifyReports(): bool
    {
        return $this->isAdmin() || $this->position === Position::SekretarisBendahara;
    }

    /** FR-AGN-03: Sekretaris/Bendahara menyetujui rekap honor (Admin juga boleh). */
    public function canApproveHonor(): bool
    {
        return $this->isAdmin() || $this->position === Position::SekretarisBendahara;
    }

    public function isAdmin(): bool
    {
        return $this->role === Role::Admin;
    }

    /** Admin aktif terakhir: tidak boleh dinonaktifkan/diturunkan (lab tidak boleh tanpa Admin). */
    public function isLastActiveAdmin(): bool
    {
        return $this->isAdmin() && $this->is_active
            && ! static::where('role', Role::Admin)->where('is_active', true)->whereKeyNot($this->id)->exists();
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
