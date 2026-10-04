<?php

namespace App\Support;

use App\Models\LabClass;

/**
 * Token gabung kelas (FR-ENR-01): 6 karakter huruf besar & angka tanpa O/0/I/1
 * agar tidak salah baca; unik di antara kelas pada semester yang sama.
 */
class JoinToken
{
    public const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public const LENGTH = 6;

    public static function generate(int $semesterId): string
    {
        do {
            $token = '';

            for ($i = 0; $i < self::LENGTH; $i++) {
                $token .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
        } while (LabClass::where('semester_id', $semesterId)->where('join_token', $token)->exists());

        return $token;
    }
}
