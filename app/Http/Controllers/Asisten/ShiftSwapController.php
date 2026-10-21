<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\Shift\SwapShift;
use App\Http\Controllers\Controller;
use App\Models\Shift;
use App\Models\ShiftSwap;
use App\Support\Schedule\AssistantWeek;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Tukar shift (US-A05, FR-AS-03).
 */
class ShiftSwapController extends Controller
{
    public function candidates(Request $request, Shift $shift): JsonResponse
    {
        abort_unless($shift->user_id === $request->user()->id, 403);

        return response()->json(AssistantWeek::swapCandidates($shift));
    }

    public function store(Request $request, SwapShift $swap): RedirectResponse
    {
        $validated = $request->validate([
            'shift_id' => ['required', 'integer', 'exists:shifts,id'],
            'to_user_id' => ['required', 'integer'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ], [], ['to_user_id' => 'asisten tujuan', 'reason' => 'alasan']);

        $created = $swap->request($request->user(), Shift::whereKey($validated['shift_id'])->firstOrFail(), (int) $validated['to_user_id'], $validated['reason']);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Pengajuan tukar shift dikirim ke {$created->toUser->name}."]);

        return back();
    }

    public function respond(Request $request, ShiftSwap $shiftSwap, SwapShift $swap): RedirectResponse
    {
        $validated = $request->validate([
            'approve' => ['required', 'boolean'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $swap->respond($request->user(), $shiftSwap, $request->boolean('approve'), $validated['note'] ?? null);
        Inertia::flash('toast', ['type' => 'success', 'message' => $request->boolean('approve') ? 'Tukar shift disetujui. Jadwal diperbarui.' : 'Pengajuan tukar shift ditolak.']);

        return back();
    }

    public function destroy(Request $request, ShiftSwap $shiftSwap, SwapShift $swap): RedirectResponse
    {
        $swap->cancel($request->user(), $shiftSwap);
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Pengajuan tukar shift dibatalkan.']);

        return back();
    }
}
