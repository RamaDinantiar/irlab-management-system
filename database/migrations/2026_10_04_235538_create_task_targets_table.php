<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD 6.1 `task_targets` (FR-AT-03): satu tugas → banyak kelas, tenggat per kelas.
     * Pre-test dapat dibuka saat sesi dimulai: open_at NULL + window_minutes.
     */
    public function up(): void
    {
        Schema::create('task_targets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('meeting_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('open_at')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->unsignedSmallInteger('window_minutes')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->unique(['task_id', 'class_id']);
            $table->index(['class_id', 'due_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_targets');
    }
};
