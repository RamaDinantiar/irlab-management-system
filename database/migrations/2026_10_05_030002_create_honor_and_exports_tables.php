<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PRD 6.1 `honor_rates`, `honor_recaps`, `exports` (FR-AGN, FR-ADM-10).
     */
    public function up(): void
    {
        Schema::create('honor_rates', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('rate_per_hour');
            $table->date('effective_from');
            $table->foreignId('set_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('honor_recaps', function (Blueprint $table) {
            $table->id();
            $table->char('month', 7); // YYYY-MM
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('total_shifts');
            $table->decimal('total_hours', 7, 2);
            $table->unsignedInteger('rate_per_hour');
            $table->unsignedBigInteger('amount');
            $table->string('status', 10)->default('draft'); // draft | final
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();

            $table->unique(['month', 'user_id']);
        });

        Schema::create('exports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20); // zip | docx | excel (pdf = ekspor lama)
            $table->json('params_json');
            $table->string('status', 20)->default('queued'); // queued | processing | done | empty | failed
            $table->unsignedSmallInteger('progress')->default(0);
            $table->foreignId('file_id')->nullable()->constrained('files')->nullOnDelete();
            $table->string('error', 500)->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exports');
        Schema::dropIfExists('honor_recaps');
        Schema::dropIfExists('honor_rates');
    }
};
