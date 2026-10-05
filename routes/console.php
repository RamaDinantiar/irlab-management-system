<?php

use App\Actions\Announcement\NotifyAnnouncements;
use App\Actions\Shift\SwapShift;
use App\Actions\Task\RemindDeadlines;
use App\Models\Export;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

// US-A05-3: pengajuan tukar shift kedaluwarsa 24 jam sebelum shift.
Artisan::command('shifts:expire-swaps', function () {
    $this->info(SwapShift::expireStale().' pengajuan tukar shift kedaluwarsa.');
})->purpose('Tandai pengajuan tukar shift yang kedaluwarsa');

// FR-AGN-04: file ekspor dihapus otomatis setelah 7 hari.
Artisan::command('exports:prune', function () {
    $old = Export::where('created_at', '<', now()->subDays(7))->with('file')->get();
    $old->each(function (Export $export) {
        $export->file?->delete();
        $export->delete();
    });
    $this->info($old->count().' ekspor lama dihapus.');
})->purpose('Hapus ekspor rekap yang lebih dari 7 hari');

Schedule::command('shifts:expire-swaps')->hourly();
Schedule::command('exports:prune')->daily();

// Pengumuman terjadwal → notifikasi saat terbit.
Artisan::command('announcements:notify', function (NotifyAnnouncements $notify) {
    $this->info($notify().' pengumuman diberitahukan.');
})->purpose('Kirim notifikasi pengumuman yang baru terbit');

// A8: pengingat tenggat H-1 (in-app + email) untuk praktikan yang belum mengumpulkan.
Artisan::command('tasks:remind-deadlines', function (RemindDeadlines $remind) {
    $this->info($remind().' pengingat tenggat dikirim.');
})->purpose('Kirim pengingat tenggat H-1');

Schedule::command('announcements:notify')->everyFiveMinutes();
Schedule::command('tasks:remind-deadlines')->hourly();
