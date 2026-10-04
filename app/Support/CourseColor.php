<?php

namespace App\Support;

/**
 * Warna blok jadwal per mata kuliah (Figma "Schedule"): tetap untuk mata
 * kuliah yang sama di semua halaman. Lihat resources/js/lib/schedule-colors.ts.
 */
class CourseColor
{
    public const PALETTE = ['red', 'green', 'yellow', 'blue', 'orange'];

    public static function for(int $courseId): string
    {
        return self::PALETTE[$courseId % count(self::PALETTE)];
    }
}
