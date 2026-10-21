<?php

namespace App\Http\Controllers\Praktikan;

use App\Actions\Meeting\SyncMeetingSessions;
use App\Http\Controllers\Controller;
use App\Support\Dashboard\LiveSessions;
use App\Support\Dashboard\PraktikanDashboardData;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request, SyncMeetingSessions $sync): Response
    {
        // Sesi otomatis tetap tepat walau scheduler terlambat.
        $sync->throttled();

        $user = $request->user();
        // Lokal saja: ?contoh=kosong menampilkan empty state "belum punya kelas".
        $withoutClasses = app()->isLocal() && $request->query('contoh') === 'kosong';

        // Closure: polling sesi berlangsung (only: liveSessions) tidak membangun ulang seluruh dashboard.
        return Inertia::render('praktikan/dashboard', [
            'dashboard' => fn () => PraktikanDashboardData::for($user, withoutClasses: $withoutClasses),
            'liveSessions' => fn () => $withoutClasses ? [] : LiveSessions::forStudent($user),
        ]);
    }
}
