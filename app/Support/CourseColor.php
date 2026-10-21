<?php

namespace App\Support;

use App\Models\Course;

/**
 * Warna mata kuliah di jadwal & legenda (Figma "Schedule"). Disimpan di
 * `courses.color` dan dipilih Admin; lihat resources/js/lib/schedule-colors.ts.
 */
class CourseColor
{
    public const PALETTE = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'cyan', 'brown', 'lime'];

    /** Legenda Figma "Schedule". */
    public const FIGMA = [
        'machine learning' => 'red',
        'database system' => 'orange',
        'pengantar big data' => 'yellow',
        'deep learning' => 'green',
        'mobile programming' => 'blue',
        'analisis dan perancangan' => 'purple',
        'analisis & perancangan' => 'purple',
    ];

    public static function for(Course $course): string
    {
        return $course->color ?? self::suggest($course);
    }

    /**
     * Warna awal mata kuliah baru: sesuai legenda Figma, kode yang sama di
     * semester lain, atau warna pertama yang belum dipakai di semesternya.
     */
    public static function suggest(Course $course): string
    {
        if ($color = self::FIGMA[mb_strtolower(trim($course->name))] ?? null) {
            return $color;
        }

        $others = Course::query()->whereKeyNot($course->getKey())->whereNotNull('color');

        if ($course->code && $color = (clone $others)->where('code', $course->code)->latest('id')->value('color')) {
            return $color;
        }

        $used = $course->semester_id ? (clone $others)->where('semester_id', $course->semester_id)->pluck('color')->all() : [];

        return collect(self::PALETTE)->diff([...$used, ...self::FIGMA])->first()
            ?? collect(self::PALETTE)->diff($used)->first()
            ?? self::PALETTE[crc32((string) $course->code) % count(self::PALETTE)];
    }
}
