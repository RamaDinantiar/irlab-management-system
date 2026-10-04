<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD 6.1 `meetings`: pertemuan 1–n per kelas + modul PDF (FR-AC-04).
     */
    public function up(): void
    {
        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->unsignedTinyInteger('number');
            $table->date('date');
            $table->string('module_title', 150)->nullable();
            $table->foreignId('module_file_id')->nullable()->constrained('files')->nullOnDelete();
            $table->timestamp('module_release_at')->nullable();
            $table->foreignId('responsible_assistant_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('started_at')->nullable();
            $table->timestamps();

            $table->unique(['class_id', 'number']);
            $table->index(['class_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meetings');
    }
};
