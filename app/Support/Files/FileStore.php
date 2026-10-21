<?php

namespace App\Support\Files;

use App\Models\StoredFile;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use ZipArchive;

/**
 * Penyimpanan file aman (PRD 8.1):
 *  - NFR-F01 validasi ekstensi DAN MIME asli dari isi file (finfo);
 *  - NFR-F02 batas ukuran per jenis;
 *  - NFR-F03 disk privat, nama UUID;
 *  - NFR-F05 ZIP diperiksa tanpa ekstraksi (path traversal, symlink, zip bomb);
 *  - NFR-F09 checksum SHA-256.
 * NFR-F06 (ClamAV) belum aktif: scan_status langsung "clean".
 */
class FileStore
{
    /** Jenis yang diizinkan → [ekstensi, MIME asli]. */
    public const KINDS = [
        'pdf' => [['pdf'], ['application/pdf']],
        'zip' => [['zip'], ['application/zip', 'application/x-zip-compressed']],
        'image' => [['jpg', 'jpeg', 'png'], ['image/jpeg', 'image/png']],
    ];

    /**
     * @param  list<'pdf'|'zip'|'image'>  $kinds  jenis yang diterima untuk unggahan ini
     */
    public function store(UploadedFile $upload, array $kinds, string $purpose, ?Model $owner, ?User $uploader, string $field = 'file', ?int $maxKb = null): StoredFile
    {
        $kind = $this->detectKind($upload, $kinds, $field);
        $limit = $maxKb ?? (int) config("lab.files.limits.{$kind}");

        if ($upload->getSize() > $limit * 1024) {
            $this->fail($field, sprintf('Ukuran file maksimal %s untuk %s.', $this->human($limit * 1024), strtoupper($kind === 'image' ? 'gambar' : $kind)));
        }

        if ($kind === 'zip') {
            $this->inspectZip($upload->getRealPath(), $field);
        }

        $disk = config('lab.files.disk');
        $extension = strtolower($upload->getClientOriginalExtension());
        $path = $upload->storeAs($purpose.'/'.now()->format('Y/m'), Str::uuid().'.'.$extension, $disk);

        return StoredFile::create([
            'owner_type' => $owner?->getMorphClass(),
            'owner_id' => $owner?->getKey(),
            'purpose' => $purpose,
            'disk' => $disk,
            'path' => $path,
            'original_name' => Str::limit($upload->getClientOriginalName(), 250, ''),
            'mime' => self::realMime($upload),
            'size' => $upload->getSize(),
            'sha256' => hash_file('sha256', $upload->getRealPath()),
            'uploaded_by' => $uploader?->id,
        ]);
    }

    /**
     * File buatan sistem (ekspor rekap) — tidak melalui validasi unggahan.
     */
    public function storeGenerated(string $localPath, string $name, string $mime, string $purpose, ?Model $owner): StoredFile
    {
        $disk = config('lab.files.disk');
        $path = $purpose.'/'.now()->format('Y/m').'/'.Str::uuid().'.'.pathinfo($name, PATHINFO_EXTENSION);
        $stream = fopen($localPath, 'r');
        if ($stream === false) {
            throw new RuntimeException("File hasil generate tidak dapat dibuka: {$localPath}");
        }

        Storage::disk($disk)->put($path, $stream);

        return StoredFile::create([
            'owner_type' => $owner?->getMorphClass(),
            'owner_id' => $owner?->getKey(),
            'purpose' => $purpose,
            'disk' => $disk,
            'path' => $path,
            'original_name' => $name,
            'mime' => $mime,
            'size' => filesize($localPath),
            'sha256' => hash_file('sha256', $localPath),
            'uploaded_by' => null,
        ]);
    }

    /**
     * @param  list<string>  $kinds
     */
    private function detectKind(UploadedFile $upload, array $kinds, string $field): string
    {
        $extension = strtolower($upload->getClientOriginalExtension());
        $mime = self::realMime($upload);

        foreach ($kinds as $kind) {
            [$extensions, $mimes] = self::KINDS[$kind];

            if (in_array($extension, $extensions, true) && in_array($mime, $mimes, true)) {
                return $kind;
            }
        }

        $allowed = collect($kinds)->flatMap(fn ($kind) => self::KINDS[$kind][0])->map(fn ($e) => strtoupper($e))->join(', ');
        $this->fail($field, "Format file tidak didukung atau isi file tidak sesuai ekstensinya. Format yang diterima: {$allowed}.");
    }

    /**
     * NFR-F01: MIME dari isi file (finfo), bukan header browser maupun ekstensi.
     */
    public static function realMime(UploadedFile $upload): string
    {
        return (string) (new \finfo(FILEINFO_MIME_TYPE))->file($upload->getRealPath());
    }

    private function inspectZip(string $path, string $field): void
    {
        $zip = new ZipArchive;

        if ($zip->open($path, ZipArchive::RDONLY) !== true) {
            $this->fail($field, 'File ZIP rusak atau tidak dapat dibaca.');
        }

        try {
            if ($zip->numFiles > config('lab.files.zip.max_entries')) {
                $this->fail($field, 'ZIP berisi lebih dari '.config('lab.files.zip.max_entries').' file.');
            }

            $total = 0;

            for ($i = 0; $i < $zip->numFiles; $i++) {
                $stat = $zip->statIndex($i);
                if ($stat === false) {
                    $this->fail($field, 'ZIP rusak atau tidak dapat dibaca.');
                }

                $name = str_replace('\\', '/', $stat['name']);

                if (str_starts_with($name, '/') || preg_match('#(^|/)\.\.(/|$)#', $name) || preg_match('/^[A-Za-z]:/', $name)) {
                    $this->fail($field, 'ZIP berisi path yang tidak aman.');
                }

                $zip->getExternalAttributesIndex($i, $opsys, $attributes);
                if ($opsys === ZipArchive::OPSYS_UNIX && (($attributes >> 16) & 0170000) === 0120000) {
                    $this->fail($field, 'ZIP berisi symlink yang tidak diizinkan.');
                }

                $total += $stat['size'];
                if ($total > config('lab.files.zip.max_uncompressed')) {
                    $this->fail($field, 'Isi ZIP setelah diekstrak terlalu besar (maks. 100 MB).');
                }
            }
        } finally {
            $zip->close();
        }
    }

    private function human(int $bytes): string
    {
        return $bytes >= 1024 * 1024 ? round($bytes / 1024 / 1024).' MB' : round($bytes / 1024).' KB';
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
