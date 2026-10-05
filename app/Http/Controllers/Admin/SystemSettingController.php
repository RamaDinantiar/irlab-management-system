<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\HonorRate;
use App\Models\Setting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin › Pengaturan Sistem (FR-ADM-10): durasi idle, batas ukuran file,
 * tarif honor per jam (dengan riwayat), kop PDF berita acara.
 */
class SystemSettingController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/system-settings', [
            'settings' => Setting::current(),
            'currentRate' => HonorRate::rateOn(now()->toDateString()),
            'rates' => HonorRate::with('setter:id,name')->orderByDesc('effective_from')->orderByDesc('id')->limit(20)->get()
                ->map(fn (HonorRate $r) => [
                    'id' => $r->id,
                    'rate' => $r->rate_per_hour,
                    'effectiveFrom' => $r->effective_from->toDateString(),
                    'setBy' => $r->setter?->name,
                    'createdAt' => $r->created_at->toIso8601String(),
                ]),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'idle_minutes' => ['required', 'integer', 'between:5,240'],
            'limit_pdf_mb' => ['required', 'integer', 'between:1,50'],
            'limit_zip_mb' => ['required', 'integer', 'between:1,100'],
            'limit_image_mb' => ['required', 'integer', 'between:1,20'],
            'pdf_header_title' => ['required', 'string', 'max:100'],
            'pdf_header_subtitle' => ['required', 'string', 'max:150'],
            'registration_open' => ['boolean'],
            'registration_domains' => ['nullable', 'string', 'max:255', 'regex:/^\s*@?[a-z0-9.-]+\.[a-z]{2,}(\s*,\s*@?[a-z0-9.-]+\.[a-z]{2,})*\s*$/i'],
        ], ['registration_domains.regex' => 'Format domain tidak valid, mis. itpln.ac.id (pisahkan dengan koma).'], [
            'idle_minutes' => 'durasi idle', 'limit_pdf_mb' => 'batas PDF', 'limit_zip_mb' => 'batas ZIP', 'limit_image_mb' => 'batas gambar',
            'pdf_header_title' => 'judul kop', 'pdf_header_subtitle' => 'subjudul kop', 'registration_domains' => 'domain email',
        ]);
        $validated['registration_open'] = $request->has('registration_open') ? $request->boolean('registration_open') : (bool) Setting::value('registration_open');
        $validated['registration_domains'] = collect(explode(',', $validated['registration_domains'] ?? (string) Setting::value('registration_domains')))
            ->map(fn ($d) => strtolower(trim(ltrim(trim($d), '@'))))->filter()->unique()->join(', ');

        $before = Setting::current();
        Setting::put($validated, $request->user()->id);
        AuditLog::record('settings.updated', null, array_intersect_key($before, $validated), $validated);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengaturan sistem disimpan.']);

        return back();
    }

    public function storeRate(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'rate_per_hour' => ['required', 'integer', 'min:1000', 'max:1000000'],
            'effective_from' => ['required', 'date'],
        ], [], ['rate_per_hour' => 'tarif per jam', 'effective_from' => 'tanggal berlaku']);

        $rate = HonorRate::create([...$validated, 'set_by' => $request->user()->id]);
        AuditLog::record('honor.rate_set', $rate, null, $validated);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Tarif honor baru disimpan. Rekap Draft akan memakai tarif ini saat dihitung ulang.']);

        return back();
    }
}
