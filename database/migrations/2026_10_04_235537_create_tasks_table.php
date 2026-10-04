<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD 6.1 `tasks` (FR-AT): Pre-test, Post-test, Laporan Praktikum.
     */
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('semester_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['pretest', 'posttest', 'report'])->index();
            $table->string('title', 150);
            $table->json('body_json')->nullable();
            $table->unsignedSmallInteger('max_score')->default(100);
            $table->boolean('allow_late')->default(false);
            $table->decimal('late_penalty', 5, 2)->nullable();
            $table->enum('late_penalty_unit', ['hour', 'day'])->nullable();
            $table->json('allowed_formats');
            $table->enum('text_answer', ['none', 'optional', 'required'])->default('optional');
            $table->enum('status', ['draft', 'published'])->default('draft')->index();
            $table->unsignedTinyInteger('meeting_number')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
