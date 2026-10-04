<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\Shift\GenerateClassShifts;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Semester;
use App\Models\Shift;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

/**
 * Kelola shift (Admin, override): buat dari jadwal kelas, tambah shift jaga
 * lab berulang mingguan, hapus.
 */
class ShiftController extends Controller
{
    public function generate(Request $request, GenerateClassShifts $generate): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $semester = Semester::current() ?? throw ValidationException::withMessages(['semester' => 'Belum ada semester aktif.']);

        $count = $generate($semester);
        Inertia::flash('toast', ['type' => 'success', 'message' => $count > 0 ? "{$count} shift sesi praktikum dibuat dari jadwal kelas." : 'Semua sesi kelas sudah memiliki shift.']);

        return back();
    }

    public function store(Request $request): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);
        $semester = Semester::current() ?? throw ValidationException::withMessages(['semester' => 'Belum ada semester aktif.']);

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
            'room_id' => ['nullable', 'integer', 'exists:rooms,id'],
            'title' => ['nullable', 'string', 'max:120'],
            'date' => ['required', 'date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'repeat_weeks' => ['nullable', 'integer', 'min:1', 'max:20'],
        ], [], ['user_id' => 'asisten', 'end_time' => 'jam selesai']);

        $date = CarbonImmutable::parse($validated['date']);
        $created = 0;

        for ($week = 0; $week < ($validated['repeat_weeks'] ?? 1); $week++) {
            $day = $date->addWeeks($week);
            if ($day->isAfter($semester->end_date) || Shift::overlaps($validated['user_id'], $day->toDateString(), $validated['start_time'], $validated['end_time'])) {
                continue;
            }

            Shift::create([
                'semester_id' => $semester->id,
                'user_id' => $validated['user_id'],
                'room_id' => $validated['room_id'] ?? null,
                'title' => $validated['title'] ?: 'Jaga Lab',
                'date' => $day->toDateString(),
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
            ]);
            $created++;
        }

        AuditLog::record('shift.created', $semester, null, [...$validated, 'created' => $created]);
        Inertia::flash('toast', ['type' => $created ? 'success' : 'info', 'message' => $created ? "{$created} shift ditambahkan." : 'Tidak ada shift ditambahkan (bentrok atau di luar semester).']);

        return back();
    }

    public function destroy(Request $request, Shift $shift): RedirectResponse
    {
        abort_unless($request->user()->isAdmin(), 403);

        if ($shift->report()->exists()) {
            throw ValidationException::withMessages(['shift' => 'Shift yang sudah memiliki laporan tidak dapat dihapus.']);
        }

        AuditLog::record('shift.deleted', $shift, $shift->only(['user_id', 'date', 'start_time', 'end_time']));
        $shift->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Shift dihapus.']);

        return back();
    }
}
