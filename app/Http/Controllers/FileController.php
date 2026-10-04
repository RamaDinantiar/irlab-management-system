<?php

namespace App\Http\Controllers;

use App\Models\StoredFile;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * NFR-F04: file hanya lewat controller ini — signed URL 15 menit + cek hak
 * akses pemilik; header Content-Disposition & nosniff.
 */
class FileController extends Controller
{
    public function show(Request $request, StoredFile $file): BinaryFileResponse
    {
        abort_unless($file->visibleTo($request->user()), 403);
        abort_if($file->scan_status !== 'clean', 423, 'File sedang diperiksa.');

        $inline = $request->boolean('inline') && $file->mime === 'application/pdf';

        $response = response()->file($file->absolutePath(), [
            'Content-Type' => $file->mime,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ]);

        $response->setContentDisposition($inline ? 'inline' : 'attachment', $file->original_name, 'file');

        return $response;
    }
}
