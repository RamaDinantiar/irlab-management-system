<?php

namespace App\Http\Controllers\Asisten;

use App\Http\Controllers\Controller;
use App\Support\Dashboard\AsistenDashboardData;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        return Inertia::render('asisten/dashboard', [
            'dashboard' => AsistenDashboardData::for($request->user()),
        ]);
    }
}
