<?php

namespace App\Support;

/**
 * Tujuan redirect dari data (notifikasi, query string) hanya boleh path internal.
 * Menolak "//host" dan "/\host" yang oleh browser dibaca sebagai situs lain.
 */
class SafeRedirect
{
    public static function isInternalPath(mixed $url): bool
    {
        return is_string($url)
            && str_starts_with($url, '/')
            && ! str_starts_with($url, '//')
            && ! str_contains($url, '\\')
            && ! preg_match('/[\x00-\x1F\x7F]/', $url);
    }
}
