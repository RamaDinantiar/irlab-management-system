<?php

namespace App\Http\Middleware;

use App\Models\Semester;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                // FR-AUTH-06: dipakai timer idle di frontend.
                'session' => $request->user() ? [
                    'lifetime' => (int) config('session.lifetime'),
                    'remembered' => (bool) $request->session()->get('auth.remembered', false),
                ] : null,
            ],
            // FR-ADM-02: semester aktif (label di topbar; data operasional terfilter ke sini).
            'activeSemester' => fn () => $request->user()
                ? Semester::current()?->only(['id', 'name'])
                : null,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
