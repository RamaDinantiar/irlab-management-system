<?php

namespace App\Support\Reports;

use App\Models\SupervisionReport;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\TemplateProcessor;

/**
 * FR-AGN-02: "Laporan Kegiatan Harian" (Word) dari template resmi lab di
 * resources/templates/laporan-mengawas.docx — satu dokumen = satu hari, berisi
 * semua sesi yang Diverifikasi pada hari itu. Kop, logo & gaya mengikuti template;
 * hanya penanda ${...} yang diisi:
 *  - ${hari_tanggal}
 *  - baris tabel per sesi: ${no} ${kode_mk} ${mata_kuliah} ${kelas} ${asisten} ${dosen} ${materi} ${deskripsi}
 *  - blok ${lampiran}…${/lampiran} per sesi: ${judul_lampiran} + ${foto}
 */
class DailyActivityReport
{
    public const TEMPLATE = 'templates/laporan-mengawas.docx';

    /** Batas foto di lampiran (lebar × tinggi maksimal, rasio tetap). */
    private const PHOTO_BOX = ['width' => '12cm', 'height' => '9cm'];

    /**
     * @param  Collection<int, SupervisionReport>  $reports  laporan satu tanggal, urut jam mulai
     */
    public static function save(CarbonImmutable $date, Collection $reports, string $path): void
    {
        // Nilai dari laporan (mis. "&" atau "<" di catatan) di-escape agar XML Word tetap valid.
        Settings::setOutputEscapingEnabled(true);

        $doc = new TemplateProcessor(resource_path(self::TEMPLATE));
        $doc->setValue('hari_tanggal', $date->translatedFormat('l, j F Y'));

        $reports = $reports->values();
        $doc->cloneRow('no', $reports->count());
        $doc->cloneBlock('lampiran', $reports->count(), true, true);

        foreach ($reports as $index => $report) {
            $n = $index + 1;
            $class = $report->labClass;
            $course = $class ? $class->course->name : $report->activity;

            $doc->setValues([
                "no#{$n}" => (string) $n,
                "kode_mk#{$n}" => $class?->course->code ?? '-',
                "mata_kuliah#{$n}" => $course,
                "kelas#{$n}" => $class->name ?? '-',
                "asisten#{$n}" => $report->assistants->values()->map(fn ($user, $i) => ($i + 1).'. '.$user->name)->join("\n"),
                "dosen#{$n}" => $class?->lecturer ?: '-',
                "materi#{$n}" => $report->material ?: '-',
                "deskripsi#{$n}" => $report->notes,
            ]);

            $time = substr($report->start_time, 0, 5).' – '.substr($report->end_time, 0, 5);
            $doc->setValue("judul_lampiran#{$n}", trim($course.' '.($class->name ?? ''))." ({$time})");
            self::photos($doc, "foto#{$n}", $report);
        }

        $doc->saveAs($path);
    }

    /** Satu foto per baris; laporan tanpa foto diberi keterangan. */
    private static function photos(TemplateProcessor $doc, string $placeholder, SupervisionReport $report): void
    {
        $photos = $report->photos->filter(fn ($photo) => is_file($photo->absolutePath()))->values();

        if ($photos->isEmpty()) {
            $doc->setValue($placeholder, '(Tidak ada foto dokumentasi)');

            return;
        }

        $doc->setValue($placeholder, $photos->keys()->map(fn ($i) => '${'.$placeholder.'_'.$i.'}')->join("\n"));

        foreach ($photos as $i => $photo) {
            $doc->setImageValue("{$placeholder}_{$i}", ['path' => $photo->absolutePath(), ...self::PHOTO_BOX]);
        }
    }
}
