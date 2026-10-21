<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Warna mata kuliah di jadwal & legenda (Figma "Schedule"), dipilih Admin.
 * Data lama diisi sesuai legenda Figma; mata kuliah lain mendapat warna
 * tambahan per kode, sehingga kode yang sama tetap sewarna antar-semester.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->string('color', 16)->nullable()->after('name');
        });

        $figma = [
            'machine learning' => 'red',
            'database system' => 'orange',
            'pengantar big data' => 'yellow',
            'deep learning' => 'green',
            'mobile programming' => 'blue',
            'analisis dan perancangan' => 'purple',
            'analisis & perancangan' => 'purple',
        ];
        $spare = ['pink', 'cyan', 'purple', 'yellow', 'red', 'orange', 'green', 'blue'];
        $byCode = [];
        $next = 0;

        foreach (DB::table('courses')->orderBy('code')->orderBy('id')->get(['id', 'code', 'name']) as $course) {
            $color = $figma[mb_strtolower(trim($course->name))]
                ?? $byCode[$course->code]
                ?? $spare[$next++ % count($spare)];
            $byCode[$course->code] ??= $color;

            DB::table('courses')->where('id', $course->id)->update(['color' => $color]);
        }
    }

    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};
