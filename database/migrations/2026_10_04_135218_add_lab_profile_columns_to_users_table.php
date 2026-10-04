<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kolom profil lab pada tabel users (PRD 6.1).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('nim', 20)->nullable()->unique()->after('id');
            $table->enum('role', ['praktikan', 'asisten', 'admin'])->default('praktikan')->after('email');
            $table->enum('position', ['none', 'sekretaris', 'bendahara'])->default('none')->after('role');
            $table->string('major')->nullable()->after('position');
            $table->unsignedSmallInteger('cohort_year')->nullable()->after('major');
            $table->boolean('is_active')->default(true)->after('cohort_year');
            $table->boolean('must_change_password')->default(false)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['nim']);
            $table->dropColumn(['nim', 'role', 'position', 'major', 'cohort_year', 'is_active', 'must_change_password']);
        });
    }
};
