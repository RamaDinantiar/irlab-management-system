<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Audit "class.token_regenerated" dulu menyimpan token lama & baru, sehingga
 * token aktif bisa dibaca dari audit log. Hapus nilainya; baris audit tetap ada.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('audit_logs')
            ->where('action', 'class.token_regenerated')
            ->update(['before_json' => null, 'after_json' => null]);
    }

    public function down(): void
    {
        // Nilai token yang dihapus tidak dapat dipulihkan.
    }
};
