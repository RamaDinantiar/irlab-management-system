<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD 6.1 `seat_contracts` — FR-PST-05: UNIQUE(class_id, seat_id) dan
     * UNIQUE(class_id, user_id) menjadi penjaga konkurensi terakhir.
     */
    public function up(): void
    {
        Schema::create('seat_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
            $table->foreignId('seat_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('snapshot_name');
            $table->string('snapshot_nim', 20);
            $table->string('snapshot_major')->nullable();
            $table->timestamps();

            $table->unique(['class_id', 'seat_id']);
            $table->unique(['class_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seat_contracts');
    }
};
