<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD 6.1 `seats`: sel denah ruang (FR-ADM-05). Sel tanpa baris = lorong.
     */
    public function up(): void
    {
        Schema::create('seats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained()->cascadeOnDelete();
            $table->string('label', 20)->nullable();
            $table->unsignedTinyInteger('row');
            $table->unsignedTinyInteger('col');
            $table->string('type', 20)->default('seat'); // seat | assistant_desk | aisle | disabled
            $table->timestamps();

            $table->unique(['room_id', 'label']);
            $table->unique(['room_id', 'row', 'col']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('seats');
    }
};
