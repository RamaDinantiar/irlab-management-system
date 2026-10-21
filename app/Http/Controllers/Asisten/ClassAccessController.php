<?php

namespace App\Http\Controllers\Asisten;

use App\Actions\LabClass\ManageClassAccess;
use App\Http\Controllers\Asisten\Concerns\AuthorizesClassAssistant;
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
    use AuthorizesClassAssistant;

    public function regenerateToken(Request $request, LabClass $class, ManageClassAccess $access): RedirectResponse
    {
        $this->authorizeAssistant($request, $class, write: true);
        $token = $access->regenerateToken($class);

        Inertia::flash('toast', ['type' => 'success', 'message' => "Token baru {$class->name}: {$token}. Token lama tidak berlaku."]);

        return back();
    }

    public function lock(Request $request, LabClass $class, ManageClassAccess $access): RedirectResponse
    {
        $this->authorizeAssistant($request, $class, write: true);
        $access->setLocked($class, $request->boolean('locked'));

        return back();
    }
}
