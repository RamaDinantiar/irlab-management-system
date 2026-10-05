<?php

namespace App\Enums;

/**
 * Jenis Program (FR-APR-01). Maintenance internal, tidak membuka pendaftaran (A3).
 */
enum ProgramType: string
{
    case Workshop = 'workshop';
    case QuickTutor = 'quick_tutor';
    case Recruitment = 'recruitment';
    case Maintenance = 'maintenance';

    public function label(): string
    {
        return match ($this) {
            self::Workshop => 'Workshop',
            self::QuickTutor => 'Quick Tutor',
            self::Recruitment => 'Rekrutmen Asisten',
            self::Maintenance => 'Maintenance',
        };
    }

    /** Segmen URL (menu: /program/workshop, /program/quick-tutor, …). */
    public function slug(): string
    {
        return str_replace('_', '-', $this->value);
    }

    public static function fromSlug(string $slug): self
    {
        return self::from(str_replace('-', '_', $slug));
    }

    public function acceptsRegistrations(): bool
    {
        return $this !== self::Maintenance;
    }
}
