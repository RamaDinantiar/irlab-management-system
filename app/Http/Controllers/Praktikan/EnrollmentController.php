<?php

namespace App\Http\Controllers\Praktikan;

use App\Actions\Enrollment\JoinClass;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * US-P01: Gabung Kelas dengan token.
 */
class EnrollmentController extends Controller
{
    public function store(Request $request, JoinClass $join): RedirectResponse
    {
        $validated = $request->validate(['token' => ['required', 'string', 'max:20']], [], ['token' => 'kode kelas']);

        $class = $join($request->user(), $validated['token']);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => "Berhasil bergabung ke {$class->course->name} · {$class->name}. Jadwal dan tugas kelas sudah tersedia.",
        ]);

        return back();
    }
}
