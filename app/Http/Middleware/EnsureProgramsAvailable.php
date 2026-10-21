<?php

namespace App\Http\Middleware;

use App\Enums\ProgramType;
use App\Models\Program;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Program (Workshop, Quick Tutor, Rekrutmen, Maintenance) sementara ditutup.
 * Kode & data tetap ada; aktifkan lagi dengan LAB_PROGRAMS_ENABLED=true.
 */
class EnsureProgramsAvailable
{
    public function handle(Request $request, Closure $next): Response
    {
        if (config('lab.features.programs')) {
            return $next($request);
        }

        if (! $request->isMethod('GET')) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'Fitur Program belum tersedia.']);

            return back();
        }

        $type = $request->route('program') instanceof Program
            ? $request->route('program')->type
            : ProgramType::tryFrom(str_replace('-', '_', (string) $request->route('type')));

        return Inertia::render('program-unavailable', [
            'program' => $type?->label(),
        ])->toResponse($request);
    }
}
