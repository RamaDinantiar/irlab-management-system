<?php

namespace App\Models;

use App\Enums\Role;
use Carbon\CarbonImmutable;
use Database\Factories\AnnouncementFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pengumuman global (Admin, target peran & masa tayang) atau per kelas
 * (Asisten pengampu). Yang di-pin tampil di atas (FR-PD-6).
 *
 * @property int $id
 * @property string $scope
 * @property int|null $class_id
 * @property string $title
 * @property string $body
 * @property bool $pinned
 * @property list<string>|null $target_roles
 * @property CarbonImmutable $publish_at
 * @property CarbonImmutable|null $expire_at
 * @property int|null $created_by
 * @property CarbonImmutable|null $notified_at
 * @property-read LabClass|null $labClass
 * @property-read User|null $author
 */
class Announcement extends Model
{
    /** @use HasFactory<AnnouncementFactory> */
    use HasFactory;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'pinned' => 'boolean',
            'target_roles' => 'array',
            'publish_at' => 'datetime',
            'expire_at' => 'datetime',
            'notified_at' => 'datetime',
        ];
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
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Sedang tayang (sudah terbit, belum kedaluwarsa).
     *
     * @param  Builder<self>  $query
     */
    public function scopeLive(Builder $query): void
    {
        $query->where('publish_at', '<=', now())->where(fn ($q) => $q->whereNull('expire_at')->orWhere('expire_at', '>', now()));
    }

    /**
     * Pengumuman yang relevan untuk user: global sesuai peran + kelas yang diikuti/diampu.
     *
     * @param  Builder<self>  $query
     */
    public function scopeVisibleTo(Builder $query, User $user): void
    {
        if ($user->isAdmin()) {
            return;
        }

        $classIds = $user->role === Role::Praktikan
            ? Enrollment::where('user_id', $user->id)->select('class_id')
            : LabClass::taughtBy($user)->select('id');

        $query->where(fn ($q) => $q
            ->where(fn ($g) => $g->where('scope', 'global')->where(fn ($r) => $r->whereNull('target_roles')->orWhereJsonContains('target_roles', $user->role->value)))
            ->orWhere(fn ($c) => $c->where('scope', 'class')->whereIn('class_id', $classIds)));
    }

    /**
     * Penerima notifikasi.
     *
     * @return array<int, int>
     */
    public function audienceIds(): array
    {
        if ($this->scope === 'class') {
            return Enrollment::where('class_id', $this->class_id)->pluck('user_id')->map(fn ($id) => (int) $id)->all();
        }

        return User::where('is_active', true)
            ->when($this->target_roles, fn ($q) => $q->whereIn('role', $this->target_roles))
            ->pluck('id')->map(fn ($id) => (int) $id)->all();
    }
}
