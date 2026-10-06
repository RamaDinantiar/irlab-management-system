<?php

namespace Database\Seeders;

use App\Actions\Announcement\NotifyAnnouncements;
use App\Models\Announcement;
use App\Models\LabClass;
use App\Models\User;
use App\Support\Notifications\Notify;
use Illuminate\Database\Seeder;

/**
 * Pengumuman contoh (global & per kelas) + beberapa notifikasi agar lonceng
 * akun demo terisi.
 */
class AnnouncementSeeder extends Seeder
{
    public function run(NotifyAnnouncements $notify): void
    {
        $admin = User::where('email', 'admin@irlab.test')->first();
        $dimas = User::where('email', 'asisten@irlab.test')->first();
        $rina = User::where('email', 'praktikan@irlab.test')->first();
        $ir = LabClass::whereHas('course', fn ($q) => $q->where('code', 'IF-3103'))->where('name', 'Kelas A')->latest('id')->first();

        Announcement::create([
            'scope' => 'global', 'pinned' => true, 'created_by' => $admin->id, 'publish_at' => now()->subDay(),
            'title' => 'Lab tutup Jumat, 9 Okt (maintenance jaringan)',
            'body' => 'Praktikum hari **Jumat** dipindah ke Sabtu pagi. Cek jadwal terbaru di menu *Schedule*.',
            'expire_at' => now()->addDays(5),
        ]);
        Announcement::create([
            'scope' => 'global', 'target_roles' => ['asisten'], 'created_by' => $admin->id, 'publish_at' => now()->subDays(2),
            'title' => 'Rapat koordinasi asisten',
            'body' => 'Rapat koordinasi asisten Kamis pukul 16.00 di Lab IR. Mohon siapkan rekap laporan ngawas September.',
        ]);
        Announcement::create([
            'scope' => 'class', 'class_id' => $ir->id, 'created_by' => $dimas->id, 'publish_at' => now()->subHours(6),
            'title' => 'Modul 05 sudah dapat diunduh',
            'body' => 'Silakan pelajari sebelum pre-test minggu depan. Bawa laptop dengan Python 3.11.',
        ]);
        Announcement::create([
            'scope' => 'global', 'created_by' => $admin->id, 'publish_at' => now()->addDays(3),
            'title' => 'Pendaftaran Workshop RAG dibuka',
            'body' => 'Kuota 40 peserta. Daftar lewat menu Program › Workshop.',
        ]);
        $notify();

        Notify::send($rina, 'grade', 'Nilai dipublikasikan', 'Nilai Post-Test Modul 05 · Machine Learning sudah dapat dilihat.', '/praktikan/grade');
        Notify::send($dimas, 'shift', 'Permintaan tukar shift', 'Yozika Arvio meminta Anda menggantikan shift Jaga Lab.', '/asisten/schedule');
        Notify::send($dimas, 'report', 'Laporan ngawas menunggu verifikasi', 'Ada laporan Diajukan yang perlu diverifikasi.', '/asisten/report?tab=verify');
    }
}
