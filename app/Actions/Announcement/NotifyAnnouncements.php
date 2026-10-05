<?php

namespace App\Actions\Announcement;

use App\Models\Announcement;
use App\Support\Notifications\Notify;

/**
 * Kirim notifikasi lonceng untuk pengumuman yang sudah terbit dan belum
 * diberitahukan (dipanggil saat simpan & oleh scheduler tiap 5 menit).
 */
class NotifyAnnouncements
{
    public function __invoke(): int
    {
        $due = Announcement::live()->whereNull('notified_at')->with('labClass.course')->get();

        foreach ($due as $announcement) {
            $announcement->forceFill(['notified_at' => now()])->save();
            $where = $announcement->labClass ? " ({$announcement->labClass->course->name} · {$announcement->labClass->name})" : '';

            Notify::send($announcement->audienceIds(), 'announcement', 'Pengumuman'.$where, $announcement->title, '/notifications');
        }

        return $due->count();
    }
}
