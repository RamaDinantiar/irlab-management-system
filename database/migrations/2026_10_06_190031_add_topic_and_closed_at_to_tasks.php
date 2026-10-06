<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Figma "Buat Post-Test": topik pembahasan; aksi cepat "Berhenti" menutup
 * target lebih awal (closed_at) meskipun pengumpulan terlambat diizinkan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->string('topic', 255)->nullable()->after('title');
        });

        Schema::table('task_targets', function (Blueprint $table) {
            $table->timestamp('closed_at')->nullable()->after('due_at');
        });
    }

    public function down(): void
    {
        Schema::table('task_targets', function (Blueprint $table) {
            $table->dropColumn('closed_at');
        });

        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('topic');
        });
    }
};
