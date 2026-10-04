<?php

namespace App\Http\Controllers\Asisten\Concerns;

use App\Models\LabClass;
use Illuminate\Http\Request;

/**
 * Akses "Ampu" (PRD Bagian 2): hanya asisten pengampu kelas. Untuk aksi yang
 * mengubah data, semester kelas juga harus belum diarsipkan.
 */
trait AuthorizesClassAssistant
{
    protected function authorizeAssistant(Request $request, LabClass $class, bool $write = false): void
    {
        abort_unless($class->isTaughtBy($request->user()), 403);

        if ($write) {
            abort_unless($class->isEditable(), 403);
        }
    }
}
