<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD 6.1 `programs`, `program_stages`, `program_form_fields`,
     * `program_registrations` (FR-APR, FR-PP).
     */
    public function up(): void
    {
        Schema::create('programs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('semester_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type', 20)->index();
            $table->string('title', 150);
            $table->string('category', 100)->nullable();
            $table->text('description')->nullable();
            $table->string('speaker_name', 120)->nullable();
            $table->string('speaker_affiliation', 150)->nullable();
            $table->string('mode', 10)->default('offline'); // offline | online
            $table->string('location', 200)->nullable();
            $table->foreignId('room_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->unsignedInteger('quota')->nullable();
            $table->unsignedInteger('fee_internal')->nullable();
            $table->unsignedInteger('fee_external')->nullable();
            $table->json('facilities')->nullable();
            $table->json('requirements')->nullable(); // rekrutmen: kriteria kualifikasi
            $table->foreignId('poster_file_id')->nullable()->constrained('files')->nullOnDelete();
            // draft (persiapan) | open | closed | finished
            $table->string('status', 20)->default('draft')->index();
            $table->timestamp('opens_at')->nullable();
            $table->timestamp('closes_at')->nullable();
            // Maintenance: asisten bertugas & catatan hasil (A3, FR-APR-04).
            $table->json('staff_ids')->nullable();
            $table->text('result_notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('program_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('order');
            $table->string('name', 100);
            $table->date('start_at')->nullable();
            $table->date('end_at')->nullable();
            $table->timestamps();
        });

        Schema::create('program_form_fields', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('order');
            $table->string('label', 150);
            $table->string('type', 20); // text | textarea | number | select | file
            $table->boolean('required')->default(true);
            $table->json('options')->nullable(); // pilihan (select)
            $table->json('rules_json')->nullable(); // file: formats, max_mb
            $table->timestamps();
        });

        Schema::create('program_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->json('answers_json')->nullable();
            $table->foreignId('current_stage_id')->nullable()->constrained('program_stages')->nullOnDelete();
            // registered | passed_docs | testing | accepted | rejected | cancelled
            $table->string('status', 20)->default('registered');
            $table->json('stage_results')->nullable(); // {stage_id: {result, note, by, at}}
            $table->boolean('attended')->default(false);
            $table->timestamps();

            $table->unique(['program_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_registrations');
        Schema::dropIfExists('program_form_fields');
        Schema::dropIfExists('program_stages');
        Schema::dropIfExists('programs');
    }
};
