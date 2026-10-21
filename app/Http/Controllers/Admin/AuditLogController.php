<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Admin › Audit Log (PRD 8.2): append-only, hanya baca. Filter aksi,
 * pelaku, rentang tanggal.
 */
class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = [
            'module' => (string) $request->query('module', ''),
            'user' => $request->integer('user') ?: null,
            'from' => $request->date('from')?->toDateString(),
            'to' => $request->date('to')?->toDateString(),
            'q' => trim((string) $request->query('q', '')),
        ];

        $logs = AuditLog::query()
            ->with('user:id,name,role')
            ->when($filters['module'], fn ($q, $m) => $q->where('action', 'like', $m.'.%'))
            ->when($filters['user'], fn ($q, $u) => $q->where('user_id', $u))
            ->when($filters['from'], fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($filters['to'], fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->when($filters['q'], fn ($q, $s) => $q->where(fn ($w) => $w->where('action', 'like', "%{$s}%")->orWhere('after_json', 'like', "%{$s}%")->orWhere('before_json', 'like', "%{$s}%")))
            ->latest('id')
            ->paginate(30)
            ->withQueryString()
            ->through(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'actor' => $log->user->name ?? 'Sistem',
                'actorRole' => $log->user?->role->value,
                'target' => $log->auditable_type ? Str::headline(class_basename($log->auditable_type)).' #'.$log->auditable_id : null,
                'before' => $log->before_json,
                'after' => $log->after_json,
                'ip' => $log->ip,
                'at' => $log->created_at->toIso8601String(),
            ]);

        return Inertia::render('admin/audit-logs', [
            'logs' => $logs,
            'filters' => $filters,
            'modules' => AuditLog::query()->selectRaw('distinct action')->pluck('action')
                ->map(fn ($a) => Str::before($a, '.'))->unique()->sort()->values(),
            'actors' => User::whereIn('id', AuditLog::query()->select('user_id')->distinct())->orderBy('name')->get(['id', 'name']),
        ]);
    }
}
