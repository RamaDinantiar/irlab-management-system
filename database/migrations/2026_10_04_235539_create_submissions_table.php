<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD 6.1 `submissions` (US-P02): riwayat versi; hanya `is_current` yang dinilai.
     */
    public function up(): void
    {
        Schema::create('submissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_target_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('text_answer')->nullable();
            $table->timestamp('submitted_at');
            $table->boolean('is_late')->default(false);
            $table->unsignedInteger('late_minutes')->default(0);
            $table->unsignedSmallInteger('version');
            $table->boolean('is_current')->default(true);
            $table->string('receipt_number', 32)->nullable()->unique();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['task_target_id', 'user_id']);
            $table->unique(['task_target_id', 'user_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submissions');
    }
};
