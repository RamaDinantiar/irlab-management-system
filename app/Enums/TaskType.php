<?php

namespace App\Enums;

/**
 * Jenis tugas (FR-AT-01). Slug dipakai di URL menu Figma
 * (Task › Laporan Praktikum / Post-Test / Pre-Test).
 */
enum TaskType: string
{
    case Pretest = 'pretest';
    case Posttest = 'posttest';
    case Report = 'report';

    public function label(): string
    {
        return match ($this) {
            self::Pretest => 'Pre-Test',
            self::Posttest => 'Post-Test',
            self::Report => 'Laporan Praktikum',
        };
    }

    public function slug(): string
    {
        return match ($this) {
            self::Pretest => 'pre-test',
            self::Posttest => 'post-test',
            self::Report => 'laporan',
        };
    }

    public static function fromSlug(?string $slug): ?self
    {
        foreach (self::cases() as $case) {
            if ($case->slug() === $slug) {
                return $case;
            }
        }

        return null;
    }
}
