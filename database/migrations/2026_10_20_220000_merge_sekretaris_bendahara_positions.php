<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Jabatan Sekretaris dan Bendahara digabung menjadi satu divisi
 * "Sekretaris/Bendahara" (verifikasi laporan ngawas + persetujuan honor);
 * asisten lain menjadi "Asisten Umum" (nilai 'none').
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('position', 32)->default('none')->change();
        });

        DB::table('users')->whereIn('position', ['sekretaris', 'bendahara'])->update(['position' => 'sekretaris_bendahara']);
    }

    public function down(): void
    {
        DB::table('users')->where('position', 'sekretaris_bendahara')->update(['position' => 'sekretaris']);

        Schema::table('users', function (Blueprint $table) {
            $table->enum('position', ['none', 'sekretaris', 'bendahara'])->default('none')->change();
        });
    }
};
