<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD 6.1 `supervision_reports` (berita acara mengawas, US-A03, FR-AR).
     * Tim asisten jaga (Figma: Asisten 1 Lead … Asisten 4) di tabel pivot.
     */
    public function up(): void
    {
        Schema::create('supervision_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('semester_id')->constrained()->cascadeOnDelete();
            $table->foreignId('shift_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // pembuat (lead)
            $table->foreignId('class_id')->nullable()->constrained('classes')->nullOnDelete();
            $table->foreignId('room_id')->nullable()->constrained()->nullOnDelete();
            $table->date('date');
            $table->time('start_time');
            $table->time('end_time');
            $table->string('activity', 150); // kelas/kegiatan
            $table->string('material', 150)->nullable();
            $table->unsignedSmallInteger('present_count');
            $table->string('lab_condition', 20); // baik | kendala_ringan | kendala_berat
            $table->text('notes');
            $table->string('status', 20)->default('draft'); // draft | submitted | verified | returned
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->string('return_note', 500)->nullable();
            // US-A03-4: dapat diedit hingga H+1 23.59; Admin membuka kunci dengan memperpanjang batas ini.
            $table->timestamp('editable_until');
            $table->timestamps();

            $table->index(['user_id', 'date']);
            $table->index('status');
        });

        Schema::create('supervision_report_assistants', function (Blueprint $table) {
            $table->foreignId('supervision_report_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('position');

            $table->primary(['supervision_report_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supervision_report_assistants');
        Schema::dropIfExists('supervision_reports');
    }
};
