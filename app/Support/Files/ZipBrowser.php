<?php

namespace App\Support\Files;

use App\Models\StoredFile;
use ZipArchive;

/**
 * Code Viewer isi ZIP submission (FR-AG-04, NFR-F05/F07): dibaca langsung dari
 * arsip tanpa ekstraksi ke disk; hanya file teks ≤ 1 MB yang ditampilkan;
 * tidak ada eksekusi kode.
 */
class ZipBrowser
{
    /**
     * @return list<array{path: string, size: int, viewable: bool}>
     */
    public static function entries(StoredFile $file): array
    {
        $zip = self::open($file);
        $entries = [];

        for ($i = 0; $i < $zip->numFiles; $i++) {
            $stat = $zip->statIndex($i);
            if ($stat === false || str_ends_with($stat['name'], '/')) {
                continue;
            }

            $entries[] = [
                'path' => $stat['name'],
                'size' => $stat['size'],
                'viewable' => $stat['size'] <= config('lab.files.code_viewer_max'),
            ];
        }

        $zip->close();
        usort($entries, fn ($a, $b) => strcmp($a['path'], $b['path']));

        return $entries;
    }

    /**
     * @return array{path: string, content: string|null, reason: string|null}
     */
    public static function read(StoredFile $file, string $path): array
    {
        $zip = self::open($file);
        $index = $zip->locateName($path);

        if ($index === false) {
            $zip->close();

            return ['path' => $path, 'content' => null, 'reason' => 'File tidak ditemukan di dalam ZIP.'];
        }

        $stat = $zip->statIndex($index);
        if ($stat === false) {
            $zip->close();

            return ['path' => $path, 'content' => null, 'reason' => 'File tidak dapat dibaca dari ZIP.'];
        }

        if ($stat['size'] > config('lab.files.code_viewer_max')) {
            $zip->close();

            return ['path' => $path, 'content' => null, 'reason' => 'File lebih dari 1 MB; unduh ZIP untuk melihatnya.'];
        }

        $content = (string) $zip->getFromIndex($index);
        $zip->close();

        // Deteksi biner: ada byte NUL atau bukan UTF-8 yang valid.
        if (str_contains($content, "\0") || ! mb_check_encoding($content, 'UTF-8')) {
            return ['path' => $path, 'content' => null, 'reason' => 'File biner tidak dapat ditampilkan.'];
        }

        return ['path' => $path, 'content' => $content, 'reason' => null];
    }

    private static function open(StoredFile $file): ZipArchive
    {
        $zip = new ZipArchive;
        abort_unless($zip->open($file->absolutePath(), ZipArchive::RDONLY) === true, 422, 'ZIP tidak dapat dibaca.');

        return $zip;
    }
}
