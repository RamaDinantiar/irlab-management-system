<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD 6.1 `classes`: UNIQUE(semester_id, join_token). Token NULL sampai disetujui.
     */
    public function up(): void
    {
        Schema::create('classes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('semester_id')->constrained()->cascadeOnDelete();
            $table->foreignId('course_id')->constrained()->restrictOnDelete();
            $table->string('name', 50);
            $table->unsignedTinyInteger('day_of_week'); // 1 = Senin … 7 = Minggu
            $table->time('start_time');
            $table->time('end_time');
            $table->foreignId('room_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('quota');
            $table->char('join_token', 6)->nullable();
            $table->boolean('is_locked')->default(false);
            $table->boolean('seat_contract_open')->default(false);
            $table->enum('approval_status', ['pending', 'approved', 'rejected'])->default('approved')->index();
            $table->foreignId('proposed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();

            $table->unique(['semester_id', 'join_token']);
            $table->unique(['course_id', 'name']);
            $table->index(['semester_id', 'room_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classes');
    }
};
