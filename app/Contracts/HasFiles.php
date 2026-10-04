<?php

namespace App\Contracts;

use App\Models\User;

/**
 * Pemilik file (modul, tugas, submission, laporan, pendaftaran program)
 * menentukan siapa yang boleh mengunduh filenya (NFR-F04).
 */
interface HasFiles
{
    public function fileVisibleTo(User $user): bool;
}
