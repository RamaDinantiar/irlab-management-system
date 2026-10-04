<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\LabClass\ManageClassAccess;
use App\Http\Controllers\Controller;
use App\Models\LabClass;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * US-A01-3/4: regenerate token & Lock Class untuk kelas yang diampu (Ampu).
 */
class ClassAccessController extends Controller
{
    public function regenerateToken(Request $request, LabClass $class, ManageClassAccess $access): RedirectResponse
    {
        $this->authorizeAssistant($request, $class);
        $token = $access->regenerateToken($class);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Token baru {$class->name}: {$token}. Token lama tidak berlaku."]);

        return back();
    }

    public function lock(Request $request, LabClass $class, ManageClassAccess $access): RedirectResponse
    {
        $this->authorizeAssistant($request, $class);
        $access->setLocked($class, $request->boolean('locked'));

        return back();
    }

    private function authorizeAssistant(Request $request, LabClass $class): void
    {
        abort_unless(
            $class->isEditable() && $class->assistants()->whereKey($request->user()->id)->exists(),
            403,
        );
    }
}
