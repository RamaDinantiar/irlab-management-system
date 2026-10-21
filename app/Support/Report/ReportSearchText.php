<?php

namespace App\Support\Report;

use Carbon\CarbonImmutable;
use Illuminate\Support\Arr;

/**
 * Teks pencarian satu baris laporan mengawas (Asisten › Report): seluruh isi
 * laporan + hari/tanggal dalam beberapa format, agar "kamis", "1 oktober",
 * "01/10/2026", "shift 2", atau "diverifikasi" dapat dicari.
 */
class ReportSearchText
{
    private const STATUS = [
        'draft' => 'draft',
        'submitted' => 'diajukan menunggu verifikasi',
        'verified' => 'diverifikasi',
        'returned' => 'dikembalikan',
    ];

    /**
     * @param  array<string, mixed>  $row  Baris laporan seperti yang dikirim ke halaman.
     */
    public static function for(array $row): string
    {
        $date = CarbonImmutable::parse($row['date']);

        return mb_strtolower(implode(' | ', array_filter([
            $date->translatedFormat('l, j F Y'),
            $date->translatedFormat('j M Y'),
            $date->format('d/m/Y'),
            $date->format('j/n/Y'),
            $date->format('d-m-Y'),
            $date->format('Y-m-d'),
            "shift {$row['shiftNumber']}",
            "{$row['start']}–{$row['end']} {$row['start']}-{$row['end']} ".str_replace(':', '.', "{$row['start']} {$row['end']}"),
            $row['code'],
            $row['course'],
            $row['className'],
            $row['room'],
            $row['activity'],
            $row['material'],
            $row['notes'],
            implode(' ', Arr::pluck($row['assistants'], 'name')),
            $row['author'],
            self::STATUS[$row['status']] ?? $row['status'],
            $row['returnNote'],
            $row['verifier'],
        ], fn ($part) => $part !== null && $part !== '')));
    }
}
