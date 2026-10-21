<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\Enrollment\ImportMembers;
use App\Http\Controllers\Asisten\Concerns\AuthorizesClassAssistant;
use App\Http\Controllers\Controller;
use App\Http\Resources\LabClassResource;
use App\Http\Resources\MeetingResource;
use App\Models\Announcement;
use App\Models\Attendance;
use App\Models\AuditLog;
use App\Models\Enrollment;
use App\Models\Grade;
use App\Models\LabClass;
use App\Models\User;
use App\Support\Announcements\AnnouncementData;
use App\Support\Grading\FinalScore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use OpenSpout\Common\Entity\Row;
use OpenSpout\Writer\XLSX\Writer;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Asisten › detail kelas (FR-AC-02): tab Anggota, Pertemuan, Presensi,
 * Pengaturan, Pengumuman. Denah kursi kelas ada di menu Seats.
 */
class ClassDetailController extends Controller
{
    use AuthorizesClassAssistant;

    public function members(Request $request, LabClass $class): Response
    {
        $this->authorizeAssistant($request, $class);

        $seats = $class->seatContracts()->with('seat:id,label')->get()->keyBy('user_id');
        $grades = Grade::where('status', 'published')
            ->whereHas('submission', fn ($q) => $q->where('is_current', true)->whereHas('target', fn ($t) => $t->where('class_id', $class->id)))
            ->with('submission.target.task')->get()->groupBy('submission.user_id');
        $class->loadMissing('course');

        $members = $class->enrollments()
            ->with('user:id,nim,name,email,major,cohort_year')
            ->get()
            ->sortBy(fn (Enrollment $enrollment) => $enrollment->user->nim)
            ->values()
            ->map(fn (Enrollment $enrollment) => [
                'id' => $enrollment->id,
                'nim' => $enrollment->user->nim,
                'name' => $enrollment->user->name,
                'email' => $enrollment->user->email,
                'major' => $enrollment->user->major,
                'cohortYear' => $enrollment->user->cohort_year,
                'joinedAt' => $enrollment->joined_at->toIso8601String(),
                'seat' => $seats->get($enrollment->user_id)?->seat->label,
                'average' => FinalScore::compute($class->course, $grades->get($enrollment->user_id, []))['final'],
            ]);

        return $this->render('asisten/class/show', $class, ['members' => $members]);
    }

    public function meetings(Request $request, LabClass $class): Response
    {
        $this->authorizeAssistant($request, $class);

        return $this->render('asisten/class/meetings', $class, [
            'meetings' => MeetingResource::collection(
                $class->meetings()->with('responsibleAssistant')->withCount('attendances')->get(),
            )->resolve(),
        ]);
    }

    /**
     * Rekap presensi: baris praktikan × kolom pertemuan.
     */
    public function attendance(Request $request, LabClass $class): Response
    {
        $this->authorizeAssistant($request, $class);

        $meetings = $class->meetings()->get(['id', 'class_id', 'number', 'date', 'started_at']);
        $records = Attendance::whereIn('meeting_id', $meetings->pluck('id'))->get()
            ->groupBy('user_id')
            ->map(fn ($rows) => $rows->pluck('status', 'meeting_id'));

        $students = $class->enrollments()->with('user:id,nim,name')->get()
            ->sortBy(fn (Enrollment $e) => $e->user->nim)->values()
            ->map(fn (Enrollment $enrollment) => [
                'id' => $enrollment->user->id,
                'nim' => $enrollment->user->nim,
                'name' => $enrollment->user->name,
                'statuses' => (object) ($records[$enrollment->user_id] ?? collect())->all(),
            ]);

        return $this->render('asisten/class/attendance', $class, [
            'meetings' => $meetings->map(fn ($m) => [
                'id' => $m->id, 'number' => $m->number, 'date' => $m->date->toDateString(), 'started' => $m->hasStarted(),
            ]),
            'students' => $students,
        ]);
    }

    public function settings(Request $request, LabClass $class): Response
    {
        $this->authorizeAssistant($request, $class);

        return $this->render('asisten/class/settings', $class, [
            'seatContractOpen' => $class->seat_contract_open,
        ]);
    }

    /**
     * FR-AC-05: kuota & buka/tutup periode kontrak kursi.
     */
    public function updateSettings(Request $request, LabClass $class): RedirectResponse
    {
        $this->authorizeAssistant($request, $class, write: true);

        $validated = $request->validate([
            'quota' => ['required', 'integer', 'min:'.max(1, $class->enrollments()->count()), 'max:200'],
            'seat_contract_open' => ['boolean'],
        ], ['quota.min' => 'Kuota tidak boleh lebih kecil dari jumlah anggota saat ini (:min).'], ['quota' => 'kuota']);

        $before = $class->only(['quota', 'seat_contract_open']);
        $class->forceFill([
            'quota' => $validated['quota'],
            'seat_contract_open' => $request->boolean('seat_contract_open'),
        ])->save();

        AuditLog::record('class.settings_updated', $class, $before, $class->only(['quota', 'seat_contract_open']));
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengaturan kelas disimpan.']);

        return back();
    }

    /**
     * FR-ENR-04: keluarkan praktikan dengan alasan (soft delete; submission tetap).
     */
    public function removeMember(Request $request, LabClass $class, Enrollment $enrollment): RedirectResponse
    {
        $this->authorizeAssistant($request, $class, write: true);
        abort_unless($enrollment->class_id === $class->id, 404);

        $validated = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:500']], [], ['reason' => 'alasan']);

        $enrollment->forceFill(['removed_reason' => $validated['reason'], 'removed_by' => $request->user()->id])->save();
        $enrollment->delete();
        // Kursi dilepas agar bisa dipakai praktikan lain.
        $class->seatContracts()->where('user_id', $enrollment->user_id)->delete();

        AuditLog::record('enrollment.removed', $class, ['user_id' => $enrollment->user_id], ['reason' => $validated['reason']]);
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$enrollment->user->name} dikeluarkan dari {$class->name}."]);

        return back();
    }

    /**
     * FR-AC-03: ekspor anggota (NIM, nama, jurusan, kursi, rata-rata nilai).
     */
    public function exportMembers(Request $request, LabClass $class): StreamedResponse
    {
        $this->authorizeAssistant($request, $class);
        $class->load('course');
        $seats = $class->seatContracts()->with('seat:id,label')->get()->keyBy('user_id');
        $grades = Grade::where('status', 'published')
            ->whereHas('submission', fn ($q) => $q->where('is_current', true)->whereHas('target', fn ($t) => $t->where('class_id', $class->id)))
            ->with('submission.target.task')->get()->groupBy('submission.user_id');
        $members = $class->enrollments()->with('user')->get()->sortBy(fn (Enrollment $e) => $e->user->nim);

        return response()->streamDownload(function () use ($members, $seats, $grades, $class) {
            $writer = new Writer;
            $writer->openToFile('php://output');
            $writer->addRow(Row::fromValues(['NIM', 'Nama', 'Email', 'Jurusan', 'Angkatan', 'Kursi', 'Rata-rata Nilai', 'Bergabung']));
            foreach ($members as $e) {
                $writer->addRow(Row::fromValues([
                    $e->user->nim, $e->user->name, $e->user->email, $e->user->major, $e->user->cohort_year,
                    $seats->get($e->user_id)?->seat->label, FinalScore::compute($class->course, $grades->get($e->user_id, []))['final'],
                    $e->joined_at->format('Y-m-d'),
                ]));
            }
            $writer->close();
        }, str("{$class->course->code}-{$class->name}-anggota")->slug().'.xlsx', ['Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    }

    /**
     * FR-AC-03: import praktikan ke kelas (kolom nim).
     */
    public function importMembers(Request $request, LabClass $class, ImportMembers $import): RedirectResponse
    {
        $this->authorizeAssistant($request, $class, write: true);
        $request->validate(['file' => ['required', 'file', 'mimes:xlsx,csv,txt', 'max:2048']], [], ['file' => 'file']);

        $result = $import($class, $request->file('file'));
        Inertia::flash('importResult', $result);
        Inertia::flash('toast', ['type' => $result['failed'] ? 'warning' : 'success', 'message' => "{$result['created']} dari {$result['total']} praktikan ditambahkan ke kelas."]);

        return back();
    }

    /**
     * Tab Pengumuman kelas.
     */
    public function announcements(Request $request, LabClass $class): Response
    {
        $this->authorizeAssistant($request, $class);

        return $this->render('asisten/class/announcements', $class, [
            'announcements' => $class->announcements()->with(['labClass.course', 'author'])->orderByDesc('pinned')->orderByDesc('publish_at')->get()
                ->map(fn (Announcement $a) => AnnouncementData::row($a)),
        ]);
    }

    /**
     * @param  array<string, mixed>  $props
     */
    private function render(string $component, LabClass $class, array $props): Response
    {
        $class->load(['course', 'room', 'assistants', 'semester'])->loadCount('enrollments');

        return Inertia::render($component, [
            'klass' => (new LabClassResource($class))->resolve(),
            'classAssistants' => $class->assistants->map(fn (User $user) => ['id' => $user->id, 'label' => $user->name])->values(),
            ...$props,
        ]);
    }
}
