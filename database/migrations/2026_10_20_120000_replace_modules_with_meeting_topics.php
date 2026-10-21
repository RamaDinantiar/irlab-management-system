<?php

use App\Models\StoredFile;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Modul praktikum dipegang dosen dan tidak dibagikan lewat website:
     *  - file PDF modul + tanggal rilis dihapus (file ikut dihapus dari disk);
     *  - "judul modul" menjadi "topik pertemuan" (awalan "Modul 01 · " dibuang);
     *  - teks tersimpan yang menyebut "Modul" diganti "Pertemuan".
     */
    public function up(): void
    {
        DB::table('meetings')->update(['module_file_id' => null]);
        StoredFile::where('purpose', 'module')->get()->each->delete();

        Schema::table('meetings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('module_file_id');
            $table->dropColumn('module_release_at');
            $table->renameColumn('module_title', 'topic');
        });

        DB::table('meetings')->whereNotNull('topic')->get(['id', 'topic'])->each(function ($meeting) {
            $topic = trim(preg_replace('/^Modul\s*\d+\s*[·:\-–]\s*/u', '', $meeting->topic));
            DB::table('meetings')->where('id', $meeting->id)->update(['topic' => $topic === '' ? null : $topic]);
        });

        // Pengumuman "Modul 05 sudah dapat diunduh" tidak lagi bermakna (tidak ada unduhan).
        $this->replace('announcements', 'title', 'Modul 05 sudah dapat diunduh', 'Persiapan Pertemuan 05');
        $this->replace('notifications', 'data', 'Modul 05 sudah dapat diunduh', 'Persiapan Pertemuan 05');
        $this->replace('programs', 'facilities', 'Modul Repo & Starter Code', 'Repo & Starter Code');

        foreach ([['tasks', 'title'], ['tasks', 'body_json'], ['announcements', 'title'], ['announcements', 'body'], ['notifications', 'data']] as [$table, $column]) {
            $this->replace($table, $column, 'Modul', 'Pertemuan');
            $this->replace($table, $column, 'modul', 'pertemuan');
        }
    }

    public function down(): void
    {
        // Data lama (file PDF & teks asli) tidak dapat dikembalikan; hanya skemanya.
        Schema::table('meetings', function (Blueprint $table) {
            $table->renameColumn('topic', 'module_title');
            $table->foreignId('module_file_id')->nullable()->after('module_title')->constrained('files')->nullOnDelete();
            $table->timestamp('module_release_at')->nullable()->after('module_file_id');
        });
    }

    private function replace(string $table, string $column, string $from, string $to): void
    {
        $grammar = DB::getQueryGrammar();
        $col = $grammar->wrap($column);

        DB::update("update {$grammar->wrapTable($table)} set {$col} = replace({$col}, ?, ?) where {$col} like ?", [$from, $to, '%'.$from.'%']);
    }
};
