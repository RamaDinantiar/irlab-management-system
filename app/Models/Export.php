<?php

namespace App\Models;

use App\Contracts\HasFiles;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Riwayat Generate rekap (FR-AGN-04): file berlaku 24 jam, dihapus setelah 7 hari.
 *
 * @property int $id
 * @property int $user_id
 * @property string $type
 * @property array<string, mixed> $params_json
 * @property string $status
 * @property int $progress
 * @property int|null $file_id
 * @property string|null $error
 * @property CarbonImmutable|null $expires_at
 * @property-read StoredFile|null $file
 * @property-read User $user
 */
class Export extends Model implements HasFiles
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['params_json' => 'array', 'expires_at' => 'datetime'];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsTo<StoredFile, $this>
     */
    public function file(): BelongsTo
    {
        return $this->belongsTo(StoredFile::class, 'file_id');
    }

    public function fileVisibleTo(User $user): bool
    {
        return $this->user_id === $user->id && (! $this->expires_at || $this->expires_at->isFuture());
    }
}
