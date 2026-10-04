<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD 6.1 `shifts`: jadwal mengawas asisten. `class_id` terisi untuk
     * shift sesi praktikum (Figma "Shift 1/2/3"), kosong untuk jaga lab umum.
     */
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('semester_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('room_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('class_id')->nullable()->constrained('classes')->nullOnDelete();
            $table->date('date');
            $table->time('start_time');
            $table->time('end_time');
            $table->string('title', 120)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'date']);
            $table->index(['semester_id', 'date']);
        });

        Schema::create('shift_swaps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shift_id')->constrained()->cascadeOnDelete();
            $table->foreignId('from_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('to_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason', 500);
            $table->string('status', 20)->default('pending'); // pending | approved | rejected | expired | cancelled
            $table->string('response_note', 500)->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamps();

            $table->index(['to_user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shift_swaps');
        Schema::dropIfExists('shifts');
    }
};
