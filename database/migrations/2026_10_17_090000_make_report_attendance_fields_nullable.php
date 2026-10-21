<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Jumlah praktikan hadir & kondisi lab tidak lagi diisi di form laporan
 * mengawas. Kolom dipertahankan (nullable) agar data lama tetap ada.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('supervision_reports', function (Blueprint $table) {
            $table->unsignedSmallInteger('present_count')->nullable()->change();
            $table->string('lab_condition', 20)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('supervision_reports', function (Blueprint $table) {
            $table->unsignedSmallInteger('present_count')->default(0)->change();
            $table->string('lab_condition', 20)->default('baik')->change();
        });
    }
};
