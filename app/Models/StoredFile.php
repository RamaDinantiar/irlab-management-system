<?php

namespace App\Models;

use App\Contracts\HasFiles;
use App\Enums\Role;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

/**
 * File unggahan di disk privat (PRD 8.1). Diakses hanya lewat signed URL
 * berumur 15 menit + pengecekan hak akses pemilik (NFR-F04).
 *
 * @property int $id
 * @property string|null $owner_type
 * @property int|null $owner_id
 * @property string $purpose
 * @property string $disk
 * @property string $path
 * @property string $original_name
 * @property string $mime
 * @property int $size
 * @property string $sha256
 * @property string $scan_status
 * @property int|null $uploaded_by
 */
class StoredFile extends Model
{
    protected $table = 'files';

    protected $guarded = ['id'];

    /**
     * @return MorphTo<Model, $this>
     */
    public function owner(): MorphTo
    {
        return $this->morphTo();
    }

    public function visibleTo(User $user): bool
    {
        if ($user->role === Role::Admin || $this->uploaded_by === $user->id) {
            return true;
        }

        $owner = $this->owner;

        return $owner instanceof HasFiles && $owner->fileVisibleTo($user);
    }

    /** Signed URL unduhan (atau tampil inline untuk PDF viewer). */
    public function url(bool $inline = false): string
    {
        return URL::temporarySignedRoute(
            'files.show',
            now()->addMinutes((int) config('lab.files.url_minutes')),
            ['file' => $this->id, ...($inline ? ['inline' => 1] : [])],
        );
    }

    public function absolutePath(): string
    {
        return Storage::disk($this->disk)->path($this->path);
    }

    /**
     * @return array{id: int, name: string, size: int, mime: string, url: string}
     */
    public function toClient(bool $inline = false): array
    {
        return [
            'id' => $this->id,
            'name' => $this->original_name,
            'size' => $this->size,
            'mime' => $this->mime,
            'url' => $this->url($inline),
        ];
    }

    protected static function booted(): void
    {
        static::deleted(fn (self $file) => Storage::disk($file->disk)->delete($file->path));
    }
}
