<?php

namespace Tests\Support;

use Illuminate\Http\UploadedFile;

/**
 * File uji dengan isi nyata (finfo memeriksa isi, bukan ekstensi).
 */
class Pdf
{
    public const CONTENT = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";

    public static function upload(string $name = 'dokumen.pdf', int $padKb = 0): UploadedFile
    {
        return UploadedFile::fake()->createWithContent($name, self::CONTENT.str_repeat(' ', $padKb * 1024));
    }

    /**
     * @param  array<string, string>  $entries  path => isi
     */
    public static function zip(array $entries, string $name = 'tugas.zip'): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'zip');
        $zip = new \ZipArchive;
        $zip->open($path, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
        foreach ($entries as $entry => $content) {
            $zip->addFromString($entry, $content);
        }
        $zip->close();

        return new UploadedFile($path, $name, null, null, true);
    }
}
