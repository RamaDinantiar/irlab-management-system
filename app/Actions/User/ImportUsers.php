<?php

namespace App\Actions\User;

use App\Enums\Role;
use App\Models\AuditLog;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use OpenSpout\Reader\CSV\Reader as CsvReader;
use OpenSpout\Reader\XLSX\Reader as XlsxReader;

/**
 * PRD A1 / US-D04-1: import akun praktikan dari CSV/Excel. Baris valid dibuat
 * (password sementara + email aktivasi); baris gagal dilaporkan per nomor baris.
 *
 * Kolom (baris pertama = header, tidak peka huruf besar): nim, nama, email,
 * jurusan (opsional), angkatan (opsional).
 */
class ImportUsers
{
    public const MAX_ROWS = 1000;

    public const HEADERS = ['nim', 'nama', 'email', 'jurusan', 'angkatan'];

    /** Alias header yang juga diterima. */
    private const ALIASES = ['name' => 'nama', 'major' => 'jurusan', 'cohort_year' => 'angkatan', 'program_studi' => 'jurusan', 'prodi' => 'jurusan'];

    public function __construct(private readonly CreateUserAccount $createAccount) {}

    /**
     * @return array{created: int, failed: list<array{row: int, nim: string|null, errors: list<string>}>, total: int}
     */
    public function __invoke(UploadedFile $file, Role $role = Role::Praktikan): array
    {
        $rows = $this->readRows($file);
        $created = 0;
        $failed = [];
        $seen = ['nim' => [], 'email' => []];

        foreach ($rows as $rowNumber => $row) {
            $validator = Validator::make($row, [
                'nim' => ['required', 'regex:/^\d{5,20}$/', 'unique:users,nim'],
                'nama' => ['required', 'string', 'max:255'],
                'email' => ['required', 'email', 'max:255', 'unique:users,email'],
                'jurusan' => ['nullable', 'string', 'max:255'],
                'angkatan' => ['nullable', 'integer', 'between:2000,2100'],
            ], [
                'nim.regex' => 'NIM harus 5–20 digit angka.',
            ], ['nim' => 'NIM', 'nama' => 'nama', 'email' => 'email', 'angkatan' => 'angkatan']);

            $errors = $validator->errors()->all();

            // Duplikat di dalam file yang sama.
            foreach (['nim', 'email'] as $key) {
                $value = Str::lower((string) ($row[$key] ?? ''));
                if ($value !== '' && in_array($value, $seen[$key], true)) {
                    $errors[] = strtoupper($key) === 'NIM' ? 'NIM ganda di dalam file.' : 'Email ganda di dalam file.';
                }
                $seen[$key][] = $value;
            }

            if ($errors !== []) {
                $failed[] = ['row' => $rowNumber, 'nim' => $row['nim'] ?: null, 'errors' => array_values(array_unique($errors))];

                continue;
            }

            ($this->createAccount)([
                'nim' => $row['nim'],
                'name' => $row['nama'],
                'email' => Str::lower($row['email']),
                'major' => $row['jurusan'] ?: null,
                'cohort_year' => $row['angkatan'] !== '' ? (int) $row['angkatan'] : null,
                'role' => $role->value,
            ]);
            $created++;
        }

        AuditLog::record('user.imported', null, null, [
            'file' => $file->getClientOriginalName(),
            'created' => $created,
            'failed' => count($failed),
        ]);

        return ['created' => $created, 'failed' => $failed, 'total' => count($rows)];
    }

    /**
     * Baris data (tanpa header), dikunci nomor baris di file (header = baris 1).
     *
     * @return array<int, array<string, string>>
     */
    /**
     * @param  list<string>  $required  header wajib
     */
    public function readRows(UploadedFile $file, array $required = ['nim', 'email']): array
    {
        $reader = strtolower($file->getClientOriginalExtension()) === 'xlsx' ? new XlsxReader : new CsvReader;
        $reader->open($file->getRealPath());

        $rows = [];
        $headers = null;

        try {
            foreach ($reader->getSheetIterator() as $sheet) {
                foreach ($sheet->getRowIterator() as $index => $row) {
                    $cells = array_map(fn ($cell) => trim((string) $cell), $row->toArray());

                    if ($headers === null) {
                        $headers = array_map(function (string $header) {
                            $key = Str::snake(Str::lower(trim($header, " \t\n\r\0\x0B\u{FEFF}")));

                            return self::ALIASES[$key] ?? $key;
                        }, $cells);

                        continue;
                    }

                    if (array_filter($cells, fn ($cell) => $cell !== '') === []) {
                        continue;
                    }

                    $assoc = [];
                    foreach (self::HEADERS as $key) {
                        $position = array_search($key, $headers, true);
                        $assoc[$key] = $position === false ? '' : ($cells[$position] ?? '');
                    }
                    $rows[$index] = $assoc;

                    if (count($rows) > self::MAX_ROWS) {
                        throw ValidationException::withMessages([
                            'file' => 'Maksimal '.self::MAX_ROWS.' baris per file. Pecah file menjadi beberapa bagian.',
                        ]);
                    }
                }

                break; // hanya sheet pertama
            }
        } finally {
            $reader->close();
        }

        if ($headers === null || array_diff($required, $headers) !== []) {
            throw ValidationException::withMessages([
                'file' => 'Header tidak dikenali. Kolom wajib: '.implode(', ', $required).'.',
            ]);
        }

        return $rows;
    }
}
