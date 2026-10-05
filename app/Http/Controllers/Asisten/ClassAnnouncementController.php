<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\Announcement\NotifyAnnouncements;
use App\Http\Controllers\Asisten\Concerns\AuthorizesClassAssistant;
use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\LabClass;
use App\Support\Announcements\AnnouncementData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Pengumuman per kelas oleh Asisten pengampu (PRD 4.1: Pengumuman C (Ampu)).
 */
class ClassAnnouncementController extends Controller
{
    use AuthorizesClassAssistant;

    public function store(Request $request, LabClass $class, NotifyAnnouncements $notify): RedirectResponse
    {
        $this->authorizeAssistant($request, $class, write: true);
        $data = $request->validate(AnnouncementData::rules());

        $announcement = $class->announcements()->create([
            'scope' => 'class',
            'title' => $data['title'],
            'body' => $data['body'],
            'pinned' => $request->boolean('pinned'),
            'publish_at' => $data['publish_at'] ?? now(),
            'expire_at' => $data['expire_at'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        AuditLog::record('announcement.created', $announcement, null, ['class_id' => $class->id, 'title' => $announcement->title]);
        $notify();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengumuman kelas diterbitkan.']);

        return back();
    }

    public function update(Request $request, Announcement $announcement, NotifyAnnouncements $notify): RedirectResponse
    {
        abort_unless($announcement->scope === 'class', 404);
        $this->authorizeAssistant($request, $announcement->labClass, write: true);
        $data = $request->validate(AnnouncementData::rules());

        $announcement->update([
            'title' => $data['title'],
            'body' => $data['body'],
            'pinned' => $request->boolean('pinned'),
            'publish_at' => $data['publish_at'] ?? $announcement->publish_at,
            'expire_at' => $data['expire_at'] ?? null,
        ]);
        $notify();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengumuman diperbarui.']);

        return back();
    }

    public function destroy(Request $request, Announcement $announcement): RedirectResponse
    {
        abort_unless($announcement->scope === 'class', 404);
        $this->authorizeAssistant($request, $announcement->labClass, write: true);

        AuditLog::record('announcement.deleted', $announcement, $announcement->only(['title', 'class_id']));
        $announcement->delete();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengumuman dihapus.']);

        return back();
    }
}
