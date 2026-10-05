<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Announcement\NotifyAnnouncements;
use App\Enums\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\LabClass;
use App\Models\Semester;
use App\Support\Announcements\AnnouncementData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin › Pengumuman (FR-ADM-08): global dengan target peran & masa tayang,
 * dapat juga untuk satu kelas.
 */
class AnnouncementController extends Controller
{
    public function index(): Response
    {
        $semester = Semester::current();

        return Inertia::render('admin/announcements', [
            'announcements' => Announcement::with(['labClass.course', 'author'])->orderByDesc('pinned')->orderByDesc('publish_at')->paginate(20)
                ->through(fn (Announcement $a) => AnnouncementData::row($a)),
            'classOptions' => $semester
                ? LabClass::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)->with('course')->get()
                    ->map(fn (LabClass $c) => ['id' => $c->id, 'label' => "{$c->course->name} · {$c->name}"])->values()
                : [],
        ]);
    }

    public function store(Request $request, NotifyAnnouncements $notify): RedirectResponse
    {
        $announcement = Announcement::create([...$this->validated($request), 'created_by' => $request->user()->id]);
        AuditLog::record('announcement.created', $announcement, null, $announcement->only(['scope', 'title', 'publish_at']));
        $notify();

        Inertia::flash('toast', ['type' => 'success', 'message' => $announcement->publish_at->isFuture() ? 'Pengumuman dijadwalkan.' : 'Pengumuman diterbitkan.']);

        return back();
    }

    public function update(Request $request, Announcement $announcement, NotifyAnnouncements $notify): RedirectResponse
    {
        $before = $announcement->only(['title', 'body', 'publish_at', 'expire_at']);
        $announcement->update($this->validated($request));
        AuditLog::record('announcement.updated', $announcement, $before, $announcement->only(['title', 'body', 'publish_at', 'expire_at']));
        $notify();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengumuman diperbarui.']);

        return back();
    }

    public function destroy(Announcement $announcement): RedirectResponse
    {
        AuditLog::record('announcement.deleted', $announcement, $announcement->only(['title', 'scope']));
        $announcement->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengumuman dihapus.']);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            ...AnnouncementData::rules(),
            'scope' => ['required', Rule::in(['global', 'class'])],
            'class_id' => ['nullable', 'required_if:scope,class', 'integer', 'exists:classes,id'],
            'target_roles' => ['nullable', 'array'],
            'target_roles.*' => [Rule::in(['praktikan', 'asisten', 'admin'])],
        ], [], ['class_id' => 'kelas', 'expire_at' => 'akhir tayang']);

        return [
            'scope' => $data['scope'],
            'class_id' => $data['scope'] === 'class' ? $data['class_id'] : null,
            'title' => $data['title'],
            'body' => $data['body'],
            'pinned' => $request->boolean('pinned'),
            'target_roles' => $data['scope'] === 'global' && ! empty($data['target_roles']) ? array_values($data['target_roles']) : null,
            'publish_at' => $data['publish_at'] ?? now(),
            'expire_at' => $data['expire_at'] ?? null,
        ];
    }
}
