<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Files\FileStore;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Foto profil: diunggah pemilik akun (Pengaturan Akun › Profil), tampil di
 * header & detail kursi. Disimpan di disk privat lewat FileStore (PRD 8.1).
 */
class AvatarController extends Controller
{
    /** Batas ukuran foto profil (KB). */
    private const MAX_KB = 2048;

    /** Foto dapat dilihat pengguna yang sudah masuk (nama & kursi pun tampil ke kelas). */
    public function show(User $user): BinaryFileResponse
    {
        $file = $user->avatarFile;
        abort_unless($file && $file->scan_status === 'clean', 404);

        return response()->file($file->absolutePath(), [
            'Content-Type' => $file->mime,
            'X-Content-Type-Options' => 'nosniff',
            // URL memuat ?v=<id file>, jadi aman di-cache lama di browser.
            'Cache-Control' => 'private, max-age=86400',
        ]);
    }

    public function update(Request $request, FileStore $files): RedirectResponse
    {
        $request->validate(
            ['avatar' => ['required', 'file']],
            ['avatar.required' => 'Pilih foto terlebih dahulu.'],
        );

        $user = $request->user();
        $file = $files->store($request->file('avatar'), ['image'], 'avatar', $user, $user, 'avatar', self::MAX_KB);
        $old = $user->avatarFile;
        $user->forceFill(['avatar_file_id' => $file->id])->save();
        $old?->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Foto profil diperbarui.']);

        return to_route('profile.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();
        $old = $user->avatarFile;
        $user->forceFill(['avatar_file_id' => null])->save();
        $old?->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Foto profil dihapus.']);

        return to_route('profile.edit');
    }
}
