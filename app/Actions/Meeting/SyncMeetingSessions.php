<?php

namespace App\Actions\Meeting;

use App\Events\MeetingStarted;
use App\Models\AuditLog;
use App\Models\Meeting;
use Illuminate\Support\Facades\Cache;

/**
 * Sesi kelas mulai & selesai otomatis mengikuti jam kelas pada tanggal
 * pertemuan: mencatat started_at/ended_at dan memicu MeetingStarted (membuka
 * Pre-Test terjadwal). Dijalankan scheduler tiap menit dan juga saat halaman
 * terkait dibuka, sehingga tetap tepat walau scheduler terlambat.
 */
class SyncMeetingSessions
{
    /** Panggilan dari halaman cukup sekali per 20 detik. */
    public function throttled(): void
    {
        Cache::remember('meetings:synced', 20, function () {
            $this();

            return true;
        });
    }

    public function __invoke(): int
    {
        $now = now();
        $changed = 0;

        Meeting::whereDate('date', '<=', today())
            ->where(fn ($q) => $q->whereNull('started_at')->orWhereNull('ended_at'))
            ->with('labClass.assistants:users.id')
            ->get()
            ->each(function (Meeting $meeting) use ($now, &$changed) {
                $startsAt = $meeting->startsAt();
                $endsAt = $meeting->endsAt();

                if ($now->lt($startsAt)) {
                    return;
                }

                // Pre-Test hanya dibuka bila sesi benar-benar sedang berjalan
                // (bukan pertemuan lampau yang terlewat saat scheduler mati).
                $opening = $meeting->started_at === null && $now->lt($endsAt);

                $meeting->started_at ??= $startsAt;
                $meeting->responsible_assistant_id ??= $meeting->labClass->assistants->first()?->id;

                if ($meeting->ended_at === null && $now->gte($endsAt)) {
                    $meeting->ended_at = $endsAt;
                }

                if (! $meeting->isDirty()) {
                    return;
                }

                $meeting->save();
                $changed++;

                if ($opening) {
                    AuditLog::record('meeting.started', $meeting, null, ['auto' => true]);
                    MeetingStarted::dispatch($meeting);
                }
            });

        return $changed;
    }
}
