<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Semester\ActivateSemester;
use App\Actions\Semester\CopySemesterStructure;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\SemesterRequest;
use App\Models\AuditLog;
use App\Models\Semester;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin › Semester (US-D01, FR-ADM-02).
 */
class SemesterController extends Controller
{
    public function index(): Response
    {
        $semesters = Semester::query()
            ->orderByRaw("CASE status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END")
            ->orderByDesc('start_date')
            ->get()
            ->map(fn (Semester $semester) => [
                'id' => $semester->id,
                'name' => $semester->name,
                'startDate' => $semester->start_date->toDateString(),
                'endDate' => $semester->end_date->toDateString(),
                'status' => $semester->status->value,
                'activatedAt' => $semester->activated_at?->toIso8601String(),
                'archivedAt' => $semester->archived_at?->toIso8601String(),
                'canEdit' => $semester->isEditable(),
                'canPurge' => $semester->isPurgeable(),
            ]);

        return Inertia::render('admin/semesters/index', [
            'semesters' => $semesters,
            'purgeAfterYears' => Semester::PURGE_AFTER_YEARS,
        ]);
    }

    public function store(SemesterRequest $request): RedirectResponse
    {
        $semester = Semester::create($request->validated());

        AuditLog::record('semester.created', $semester, null, $request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => "Semester {$semester->name} dibuat sebagai Draft."]);

        return to_route('admin.semesters.index');
    }

    public function update(SemesterRequest $request, Semester $semester): RedirectResponse
    {
        $before = $semester->only(['name', 'start_date', 'end_date']);
        $semester->update($request->validated());

        AuditLog::record('semester.updated', $semester, $before, $request->validated());
        Inertia::flash('toast', ['type' => 'success', 'message' => "Semester {$semester->name} diperbarui."]);

        return to_route('admin.semesters.index');
    }

    public function activate(Semester $semester, ActivateSemester $activate): RedirectResponse
    {
        $activate($semester);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Semester {$semester->name} sekarang aktif."]);

        return to_route('admin.semesters.index');
    }

    /**
     * US-D01-3: salin struktur (Mata Kuliah & bobot) dari semester lain.
     */
    public function copyStructure(Request $request, Semester $semester, CopySemesterStructure $copy): RedirectResponse
    {
        $validated = $request->validate(
            ['source_id' => ['required', 'integer', 'exists:semesters,id']],
            [],
            ['source_id' => 'semester sumber'],
        );

        $result = $copy(Semester::whereKey($validated['source_id'])->firstOrFail(), $semester);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "{$result['copied']} mata kuliah disalin ke {$semester->name}"
                .($result['skipped'] > 0 ? " ({$result['skipped']} dilewati karena kodenya sudah ada)." : '.'),
        ]);

        return to_route('admin.semesters.index');
    }

    /**
     * US-D01-4: hapus permanen hanya untuk arsip berumur > 2 tahun dan wajib
     * mengetik ulang nama semester.
     */
    public function destroy(Request $request, Semester $semester): RedirectResponse
    {
        abort_unless($semester->isPurgeable(), 403);

        if ($request->input('confirmation') !== $semester->name) {
            throw ValidationException::withMessages([
                'confirmation' => 'Ketik nama semester persis untuk mengonfirmasi.',
            ]);
        }

        AuditLog::record('semester.purged', $semester, $semester->only(['name', 'start_date', 'end_date', 'status']));
        $semester->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Semester {$semester->name} dihapus permanen."]);

        return to_route('admin.semesters.index');
    }
}
