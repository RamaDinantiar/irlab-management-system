<?php

namespace App\Http\Controllers\Praktikan;

use App\Http\Controllers\Controller;
use App\Support\Dashboard\PraktikanDashboardData;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        return Inertia::render('praktikan/dashboard', [
            'dashboard' => PraktikanDashboardData::for(
                $request->user(),
                // Lokal saja: ?contoh=kosong menampilkan empty state "belum punya kelas".
                withoutClasses: app()->isLocal() && $request->query('contoh') === 'kosong',
            ),
        ]);
    }
}
