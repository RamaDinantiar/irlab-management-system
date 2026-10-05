<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pengingat tenggat H-1 dikirim sekali per target.
     */
    public function up(): void
    {
        Schema::table('task_targets', function (Blueprint $table) {
            $table->timestamp('reminded_at')->nullable()->after('published_at');
        });
    }

    public function down(): void
    {
        Schema::table('task_targets', function (Blueprint $table) {
            $table->dropColumn('reminded_at');
        });
    }
};
