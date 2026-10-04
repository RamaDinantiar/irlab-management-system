<?php

namespace App\Enums;

/**
 * Jabatan tambahan Asisten (PRD Bagian 2): membuka hak verifikasi laporan ngawas
 * (Sekretaris) dan persetujuan rekap honor (Bendahara). Bukan peran baru.
 */
enum Position: string
{
    case None = 'none';
    case Sekretaris = 'sekretaris';
    case Bendahara = 'bendahara';

    public function label(): ?string
    {
        return match ($this) {
            self::None => null,
            self::Sekretaris => 'Sekretaris',
            self::Bendahara => 'Bendahara',
        };
    }
}
