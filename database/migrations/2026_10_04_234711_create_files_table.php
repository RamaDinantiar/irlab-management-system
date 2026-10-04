<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD 6.1 `files`: polimorfik untuk lampiran, submission, modul. Nama asli
     * hanya di database; di disk memakai UUID (NFR-F03). SHA-256 sebagai bukti
     * integritas (NFR-F09).
     */
    public function up(): void
    {
        Schema::create('files', function (Blueprint $table) {
            $table->id();
            $table->nullableMorphs('owner');
            $table->string('purpose', 32)->index();
            $table->string('disk', 32);
            $table->string('path');
            $table->string('original_name');
            $table->string('mime', 128);
            $table->unsignedBigInteger('size');
            $table->char('sha256', 64);
            $table->enum('scan_status', ['pending', 'clean', 'infected'])->default('clean');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('files');
    }
};
