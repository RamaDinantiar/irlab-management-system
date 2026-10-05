<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Pengaturan sistem (FR-ADM-10). Nilai default berasal dari config; nilai
 * tersimpan menimpanya saat boot (lihat AppServiceProvider).
 *
 * @property string $key
 * @property mixed $value
 */
class Setting extends Model
{
    public const DEFAULTS = [
        'idle_minutes' => 30,
        'limit_pdf_mb' => 10,
        'limit_zip_mb' => 20,
        'limit_image_mb' => 5,
        'pdf_header_title' => 'Laboratorium Information Retrieval',
        'pdf_header_subtitle' => 'Sistem Manajemen Laboratorium',
        // Pendaftaran mandiri praktikan (hanya email kampus).
        'registration_open' => true,
        'registration_domains' => 'itpln.ac.id',
    ];

    protected $primaryKey = 'key';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];

    protected function casts(): array
    {
        return ['value' => 'json'];
    }

    /**
     * @return array<string, mixed>
     */
    public static function current(): array
    {
        try {
            $stored = Cache::rememberForever('lab.settings', fn () => Schema::hasTable('settings')
                ? static::query()->pluck('value', 'key')->all()
                : []);
        } catch (Throwable) {
            $stored = [];
        }

        return [...self::DEFAULTS, ...array_intersect_key($stored, self::DEFAULTS)];
    }

    public static function value(string $key): mixed
    {
        return self::current()[$key] ?? null;
    }

    /**
     * @param  array<string, mixed>  $values
     */
    public static function put(array $values, ?int $userId): void
    {
        foreach (array_intersect_key($values, self::DEFAULTS) as $key => $value) {
            static::updateOrCreate(['key' => $key], ['value' => $value, 'updated_by' => $userId]);
        }

        Cache::forget('lab.settings');
    }

    /** Terapkan ke config runtime (sesi idle, batas ukuran file). */
    public static function apply(): void
    {
        $s = self::current();

        config([
            'session.lifetime' => (int) $s['idle_minutes'],
            'lab.files.limits.pdf' => (int) $s['limit_pdf_mb'] * 1024,
            'lab.files.limits.zip' => (int) $s['limit_zip_mb'] * 1024,
            'lab.files.limits.image' => (int) $s['limit_image_mb'] * 1024,
        ]);
    }
}
