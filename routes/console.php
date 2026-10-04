<?php

use App\Actions\Shift\SwapShift;
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
