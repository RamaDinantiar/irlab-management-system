<?php

namespace App\Http\Controllers;

use App\Models\Announcement;
use App\Support\Announcements\AnnouncementData;
use App\Support\SafeRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Pusat notifikasi (lonceng) + pengumuman yang sedang tayang.
 */
class NotificationController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('notifications', [
            // Bukan "notifications" agar tidak menimpa prop bersama lonceng.
            'feed' => $user->notifications()->paginate(20)->through(fn (DatabaseNotification $n) => self::row($n)),
            'announcements' => Announcement::live()->visibleTo($user)->with(['labClass.course', 'author'])
                ->orderByDesc('pinned')->orderByDesc('publish_at')->limit(20)->get()
                ->map(fn (Announcement $a) => AnnouncementData::row($a)),
        ]);
    }

    /**
     * Tandai dibaca lalu buka tautannya.
     */
    public function read(Request $request, string $id): RedirectResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();
        $url = $notification->data['url'] ?? null;

        return SafeRedirect::isInternalPath($url) ? redirect()->to($url) : back();
    }

    public function readAll(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    public static function row(DatabaseNotification $n): array
    {
        return [
            'id' => $n->id,
            'kind' => $n->data['kind'] ?? 'info',
            'title' => $n->data['title'] ?? '',
            'body' => $n->data['body'] ?? '',
            'url' => $n->data['url'] ?? null,
            'read' => $n->read_at !== null,
            'createdAt' => $n->created_at->toIso8601String(),
        ];
    }
}
