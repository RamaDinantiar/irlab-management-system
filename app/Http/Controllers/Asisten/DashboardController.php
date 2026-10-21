<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\Meeting\SyncMeetingSessions;
use App\Http\Controllers\Controller;
use App\Support\Dashboard\AsistenDashboardData;
use App\Support\Dashboard\LiveSessions;
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

        // Closure: polling sesi berlangsung (only: liveSessions) tidak membangun ulang seluruh dashboard.
        return Inertia::render('asisten/dashboard', [
            'dashboard' => fn () => AsistenDashboardData::for($user),
            'liveSessions' => fn () => LiveSessions::forAssistant($user),
        ]);
    }
}
