<?php

use App\Actions\Announcement\NotifyAnnouncements;
use App\Actions\Meeting\SyncMeetingSessions;
use App\Actions\Shift\SwapShift;
use App\Actions\Task\RemindDeadlines;
use App\Actions\User\EndUserSessions;
use App\Enums\Position;
use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\Export;
use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Str;

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

// Jalur darurat (hanya lewat akses server): pulihkan akses Admin bila semua Admin
// terkunci/lupa password. Kata sandi sementara tampil di terminal, tidak lewat email.
Artisan::command('lab:recover-admin {email : Email akun yang dipulihkan} {--force : Lewati konfirmasi}', function (EndUserSessions $endSessions) {
    $email = $this->argument('email');
    $user = is_string($email) ? User::where('email', Str::lower(trim($email)))->first() : null;

    if (! $user) {
        $this->error('Akun tidak ditemukan. Untuk membuat Admin baru: php artisan db:seed --class=AdminSeeder --force');

        return 1;
    }

    if (! $this->option('force') && ! $this->confirm("Jadikan {$user->name} <{$user->email}> Admin aktif dengan kata sandi sementara baru?")) {
        return 1;
    }

    $before = ['role' => $user->role->value, 'is_active' => $user->is_active];
    $password = Str::password(16, symbols: false);

    $user->forceFill([
        'role' => Role::Admin,
        'position' => Position::None,
        'is_active' => true,
        'password' => $password,
        'must_change_password' => true,
        'email_verified_at' => $user->email_verified_at ?? now(),
    ])->save();
    $endSessions($user);
    AuditLog::record('user.admin_recovered', $user, $before, ['role' => Role::Admin->value, 'is_active' => true]);

    $this->info("{$user->email} kini Admin aktif; semua sesinya diakhiri.");
    $this->warn("Kata sandi sementara (hanya ditampilkan sekali): {$password}");

    return 0;
})->purpose('Darurat: pulihkan akses Admin untuk sebuah akun');

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

// FR-AD-01: sesi kelas mulai/selesai otomatis sesuai jam kelas.
Artisan::command('meetings:sync', function (SyncMeetingSessions $sync) {
    $this->info($sync().' sesi pertemuan diperbarui.');
})->purpose('Mulai/akhiri sesi pertemuan sesuai jam kelas');

Schedule::command('meetings:sync')->everyMinute()->withoutOverlapping();
Schedule::command('announcements:notify')->everyFiveMinutes();
Schedule::command('tasks:remind-deadlines')->hourly();
