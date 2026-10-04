<?php

namespace App\Http\Controllers\Asisten;

use App\Events\MeetingStarted;
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

/**
 * FR-AD-01 "Mulai Sesi Kelas": pilih sesi → tandai dimulai (started_at),
 * buka Pre-test terjadwal, siapkan draft laporan ngawas; presensi di layar sama.
 */
class SessionController extends Controller
{
    use AuthorizesClassAssistant;

    /** Sesi hari ini dan 7 hari ke depan dari kelas yang diampu. */
    public function index(Request $request): Response
    {
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
                'moduleTitle' => $meeting->module_title,
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

    public function show(Request $request, Meeting $meeting): Response
    {
        $class = $meeting->labClass;
        $this->authorizeAssistant($request, $class);

        $statuses = $meeting->attendances()->pluck('status', 'user_id');

        return Inertia::render('asisten/sessions/show', [
            'meeting' => (new MeetingResource($meeting->load(['moduleFile', 'responsibleAssistant'])))->resolve(),
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

    public function start(Request $request, Meeting $meeting): RedirectResponse
    {
        $this->authorizeAssistant($request, $meeting->labClass, write: true);

        if ($meeting->started_at === null) {
            $meeting->update(['started_at' => now(), 'responsible_assistant_id' => $meeting->responsible_assistant_id ?? $request->user()->id]);
            AuditLog::record('meeting.started', $meeting);
            MeetingStarted::dispatch($meeting, $request->user());
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => "Sesi pertemuan {$meeting->number} dimulai. Silakan isi presensi."]);

        return back();
    }

    /**
     * Simpan presensi sekaligus (checklist hadir/izin/sakit/alfa).
     */
    public function saveAttendance(Request $request, Meeting $meeting): RedirectResponse
    {
        $class = $meeting->labClass;
        $this->authorizeAssistant($request, $class, write: true);

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
