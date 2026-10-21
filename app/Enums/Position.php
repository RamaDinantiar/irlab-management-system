<?php

namespace App\Enums;

/**
 * Divisi Asisten (PRD Bagian 2): Asisten Umum, atau Sekretaris/Bendahara yang
 * juga memverifikasi laporan ngawas dan menyetujui rekap honor. Bukan peran baru;
 * keduanya tetap menjalankan tugas asisten (mengawas, mengajar kelas).
 */
enum Position: string
{
    case None = 'none';
    case SekretarisBendahara = 'sekretaris_bendahara';

    public function label(): string
    {
        return match ($this) {
            self::None => 'Asisten Umum',
            self::SekretarisBendahara => 'Sekretaris/Bendahara',
        };
    }
}
