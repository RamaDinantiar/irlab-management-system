<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\Meeting\SyncMeetingSessions;
use App\Http\Controllers\Asisten\Concerns\AuthorizesClassAssistant;
use App\Http\Controllers\Controller;
use App\Http\Resources\MeetingResource;
use App\Models\Attendance;
use App\Models\AuditLog;
use App\Models\Enrollment;
use App\Models\Meeting;
use App\Models\Semester;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * FR-AD-01 Sesi Kelas: sesi mulai & selesai otomatis sesuai jam kelas
 * (SyncMeetingSessions); asisten mengisi presensi & bisa mengakhiri lebih awal.
 */
class SessionController extends Controller
{
    use AuthorizesClassAssistant;

    /** Sesi hari ini dan 7 hari ke depan dari kelas yang diampu. */
    public function index(Request $request, SyncMeetingSessions $sync): Response
    {
        $sync->throttled();
        $semester = Semester::current();

        $meetings = $semester
            ? Meeting::whereHas('labClass', fn ($q) => $q->forSemester($semester)->taughtBy($request->user()))
                ->whereDateBetween('date', [today()->subDays(1), today()->addDays(7)])
                ->with(['labClass.course', 'labClass.room'])
                ->orderBy('date')->get()
            : collect();

        return Inertia::render('asisten/sessions/index', [
            'sessions' => $meetings->map(fn (Meeting $meeting) => [
                'id' => $meeting->id,
                'number' => $meeting->number,
                'date' => $meeting->date->toDateString(),
                'isToday' => $meeting->date->isToday(),
                'startedAt' => $meeting->started_at?->toIso8601String(),
                'endedAt' => $meeting->ended_at?->toIso8601String(),
                'running' => $meeting->isRunning(),
                'topic' => $meeting->topic,
                'class' => [
                    'id' => $meeting->labClass->id,
                    'name' => $meeting->labClass->name,
                    'course' => $meeting->labClass->course->name,
                    'startTime' => $meeting->labClass->startClock(),
                    'endTime' => $meeting->labClass->endClock(),
                    'room' => $meeting->labClass->room->name,
                ],
            ]),
        ]);
    }

    public function show(Request $request, Meeting $meeting, SyncMeetingSessions $sync): Response
    {
        $sync->throttled();
        $meeting->refresh();
        $class = $meeting->labClass;
        $this->authorizeAssistant($request, $class);

        $statuses = $meeting->attendances()->pluck('status', 'user_id');

        return Inertia::render('asisten/sessions/show', [
            'meeting' => (new MeetingResource($meeting->load('responsibleAssistant')))->resolve(),
            'klass' => [
                'id' => $class->id,
                'name' => $class->name,
                'course' => $class->course->name,
                'startTime' => $class->startClock(),
                'endTime' => $class->endClock(),
                'room' => $class->room->name,
                'canEdit' => $class->isEditable(),
            ],
            'students' => $class->enrollments()->with('user:id,nim,name')->get()
                ->sortBy(fn (Enrollment $e) => $e->user->nim)->values()
                ->map(fn (Enrollment $e) => [
                    'id' => $e->user->id,
                    'nim' => $e->user->nim,
                    'name' => $e->user->name,
                    'status' => $statuses[$e->user_id] ?? null,
                ]),
        ]);
    }

    /**
     * Unduh presensi satu pertemuan sebagai CSV: blok info pertemuan, tabel
     * presensi, lalu rekap. Pemisah ";" + BOM UTF-8 agar langsung rapi per
     * kolom saat dibuka di Excel berbahasa Indonesia.
     */
    public function exportAttendance(Request $request, Meeting $meeting): StreamedResponse
    {
        $class = $meeting->labClass->load(['course', 'room', 'assistants']);
        $this->authorizeAssistant($request, $class);

        $statuses = $meeting->attendances()->pluck('status', 'user_id');
        $students = $class->enrollments()->with('user:id,nim,name')->get()->sortBy(fn (Enrollment $e) => $e->user->nim)->values();
        $label = fn (?string $status) => $status ? ucfirst($status) : 'Belum diisi';
        $counts = $students->countBy(fn (Enrollment $e) => $label($statuses[$e->user_id] ?? null));
        $date = $meeting->date;

        $filename = str("presensi {$class->course->code} {$class->name} pertemuan {$meeting->number} {$meeting->date->toDateString()}")->slug().'.csv';

        return response()->streamDownload(function () use ($meeting, $class, $students, $statuses, $label, $counts, $date) {
            $out = fopen('php://output', 'w');
            if ($out === false) {
                return;
            }

            fwrite($out, "\u{FEFF}");
            // Sel diawali = + - @ diberi ' agar tidak dijalankan sebagai rumus oleh Excel.
            $row = fn (array $cells) => fputcsv($out, array_map(fn ($cell) => is_string($cell) && preg_match('/^[=+\-@]/', $cell) ? "'".$cell : $cell, $cells), ';');

            $row(['PRESENSI PRAKTIKUM']);
            $row(['Mata Kuliah', "{$class->course->code} · {$class->course->name}"]);
            $row(['Kelas', $class->name]);
            $row(['Pertemuan', $meeting->number.($meeting->topic ? " · {$meeting->topic}" : '')]);
            $row(['Tanggal', $date->translatedFormat('l, j F Y')]);
            $row(['Jam', "{$class->startClock()} – {$class->endClock()} WIB"]);
            $row(['Ruang', $class->room->name]);
            $row(['Asisten', $meeting->responsibleAssistant->name ?? $class->assistants->pluck('name')->join(', ')]);
            $row([]);

            $row(['No', 'NIM', 'Nama', 'Status']);
            foreach ($students as $i => $enrollment) {
                $row([$i + 1, $enrollment->user->nim, $enrollment->user->name, $label($statuses[$enrollment->user_id] ?? null)]);
            }
            $row([]);

            $row(['Rekap', 'Jumlah']);
            foreach (['Hadir', 'Izin', 'Sakit', 'Alfa', 'Belum diisi'] as $status) {
                $row([$status, $counts[$status] ?? 0]);
            }
            $row(['Total', $students->count()]);
            $row([]);
            $row(['Diunduh', now()->translatedFormat('j F Y H:i').' WIB']);

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    /**
     * "Akhiri Lebih Awal": sesi berhenti sebelum jam selesai kelas; Post/Pre-Test
     * mode Sesi Berjalan tidak tersedia lagi untuk kelas ini.
     */
    public function end(Request $request, Meeting $meeting): RedirectResponse
    {
        $this->authorizeAssistant($request, $meeting->labClass, write: true);
        abort_unless($meeting->isRunning(), 422, 'Sesi ini tidak sedang berjalan.');

        $meeting->update(['ended_at' => now()]);
        AuditLog::record('meeting.ended', $meeting);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Sesi pertemuan {$meeting->number} diakhiri."]);

        return back();
    }

    /**
     * Simpan presensi sekaligus (checklist hadir/izin/sakit/alfa).
     */
    public function saveAttendance(Request $request, Meeting $meeting): RedirectResponse
    {
        $class = $meeting->labClass;
        $this->authorizeAssistant($request, $class, write: true);
        // Presensi dibuka sejak jam mulai kelas dan tetap bisa dikoreksi sesudahnya.
        abort_unless($meeting->hasStarted(), 422, 'Presensi dibuka saat sesi dimulai ('.$meeting->startsAt()->format('H.i').').');

        $memberIds = $class->enrollments()->pluck('user_id')->all();
        $validated = $request->validate([
            'attendance' => ['required', 'array'],
            'attendance.*' => ['nullable', Rule::in(Attendance::STATUSES)],
        ]);

        DB::transaction(function () use ($validated, $memberIds, $meeting, $request) {
            foreach ($validated['attendance'] as $userId => $status) {
                if (! in_array((int) $userId, $memberIds, true) || $status === null) {
                    continue;
                }

                Attendance::updateOrCreate(
                    ['meeting_id' => $meeting->id, 'user_id' => (int) $userId],
                    ['status' => $status, 'recorded_by' => $request->user()->id],
                );
            }
        });

        AuditLog::record('attendance.saved', $meeting, null, ['count' => count($validated['attendance'])]);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Presensi disimpan.']);

        return back();
    }
}
