import { Head, router } from '@inertiajs/react';
import { ChevronDown, ScrollText, Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { Fragment, useState } from 'react';
import AuditLogController from '@/actions/App/Http/Controllers/Admin/AuditLogController';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

type Log = {
    id: number;
    action: string;
    actor: string;
    actorRole: string | null;
    target: string | null;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    ip: string | null;
    at: string;
};

type Filters = {
    module: string;
    user: number | null;
    from: string | null;
    to: string | null;
    q: string;
};

const fmt = (iso: string) =>
    new Date(iso).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
const show = (v: unknown) =>
    v === null || v === undefined
        ? '—'
        : typeof v === 'object'
          ? JSON.stringify(v)
          : String(v);

/** Perbedaan sebelum → sesudah per kunci. */
function Diff({
    before,
    after,
}: {
    before: Log['before'];
    after: Log['after'];
}) {
    const keys = [
        ...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
    ];
    if (keys.length === 0)
        return (
            <p className="text-xs text-muted-foreground">
                Tidak ada detail perubahan.
            </p>
        );

    return (
        <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground">
                <tr>
                    <th className="py-1 pr-4 font-medium">Kolom</th>
                    <th className="py-1 pr-4 font-medium">Sebelum</th>
                    <th className="py-1 font-medium">Sesudah</th>
                </tr>
            </thead>
            <tbody className="font-mono">
                {keys.map((k) => {
                    const b = show(before?.[k]);
                    const a = show(after?.[k]);

                    return (
                        <tr key={k} className="border-t align-top">
                            <td className="py-1 pr-4 font-sans font-medium">
                                {k}
                            </td>
                            <td
                                className={cn(
                                    'max-w-80 py-1 pr-4 break-all',
                                    b !== a &&
                                        before &&
                                        'text-danger line-through decoration-danger/40',
                                )}
                            >
                                {b}
                            </td>
                            <td
                                className={cn(
                                    'max-w-80 py-1 break-all',
                                    b !== a && 'text-success',
                                )}
                            >
                                {a}
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

/** Admin › Audit Log (PRD 8.2) — append-only, read-only. */
export default function AuditLogs({
    logs,
    filters,
    modules,
    actors,
}: {
    logs: Paginated<Log>;
    filters: Filters;
    modules: string[];
    actors: { id: number; name: string }[];
}) {
    const [open, setOpen] = useState<number | null>(null);
    const [q, setQ] = useState(filters.q);
    const go = (next: Partial<Filters>) =>
        router.get(
            AuditLogController.index.url(),
            { ...filters, ...next },
            { preserveScroll: true, preserveState: true },
        );

    return (
        <>
            <Head title="Audit Log" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Audit Log"
                    description="Jejak aksi sensitif (nilai, kontrak kursi, peran, semester, persetujuan, laporan, honor). Catatan tidak dapat diubah atau dihapus."
                />

                <div className="flex flex-wrap items-end gap-3 border bg-card p-4">
                    <label className="grid gap-1 text-xs font-medium">
                        Modul
                        <select
                            value={filters.module}
                            onChange={(e) => go({ module: e.target.value })}
                            className="h-9 border border-input bg-white px-2 text-sm font-normal"
                        >
                            <option value="">Semua</option>
                            {modules.map((m) => (
                                <option key={m} value={m}>
                                    {m}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-1 text-xs font-medium">
                        Pelaku
                        <select
                            value={filters.user ?? ''}
                            onChange={(e) =>
                                go({
                                    user: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                })
                            }
                            className="h-9 border border-input bg-white px-2 text-sm font-normal"
                        >
                            <option value="">Semua</option>
                            {actors.map((a) => (
                                <option key={a.id} value={a.id}>
                                    {a.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-1 text-xs font-medium">
                        Dari
                        <Input
                            type="date"
                            value={filters.from ?? ''}
                            onChange={(e) =>
                                go({ from: e.target.value || null })
                            }
                            className="h-9"
                        />
                    </label>
                    <label className="grid gap-1 text-xs font-medium">
                        Sampai
                        <Input
                            type="date"
                            value={filters.to ?? ''}
                            onChange={(e) => go({ to: e.target.value || null })}
                            className="h-9"
                        />
                    </label>
                    <form
                        className="relative ml-auto"
                        onSubmit={(e: FormEvent) => {
                            e.preventDefault();
                            go({ q });
                        }}
                    >
                        <Search
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            aria-hidden
                        />
                        <Input
                            type="search"
                            aria-label="Cari"
                            placeholder="Cari aksi atau isi…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="h-9 w-60 pl-9"
                        />
                    </form>
                    {(filters.module ||
                        filters.user ||
                        filters.from ||
                        filters.to ||
                        filters.q) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                                router.get(AuditLogController.index.url())
                            }
                        >
                            Reset
                        </Button>
                    )}
                </div>

                {logs.data.length === 0 ? (
                    <EmptyState
                        icon={ScrollText}
                        title="Tidak ada catatan"
                        description="Ubah filter untuk melihat catatan lain."
                    />
                ) : (
                    <div className="overflow-x-auto border bg-card">
                        <table className="w-full min-w-[56rem] text-sm">
                            <thead className="bg-primary-50 text-left font-mono text-xs">
                                <tr>
                                    <th className="px-4 py-3">Waktu</th>
                                    <th className="px-3 py-3">Pelaku</th>
                                    <th className="px-3 py-3">Aksi</th>
                                    <th className="px-3 py-3">Objek</th>
                                    <th className="px-3 py-3">IP</th>
                                    <th className="px-3 py-3">
                                        <span className="sr-only">Detail</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.data.map((log) => (
                                    <Fragment key={log.id}>
                                        <tr className="border-t">
                                            <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap">
                                                {fmt(log.at)}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {log.actor}
                                                {log.actorRole && (
                                                    <span className="block text-[11px] text-muted-foreground capitalize">
                                                        {log.actorRole}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <Badge
                                                    variant="secondary"
                                                    className="font-mono"
                                                >
                                                    {log.action}
                                                </Badge>
                                            </td>
                                            <td className="px-3 py-2.5 text-xs">
                                                {log.target ?? '—'}
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                                                {log.ip ?? '—'}
                                            </td>
                                            <td className="px-3 py-2.5 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    aria-expanded={
                                                        open === log.id
                                                    }
                                                    onClick={() =>
                                                        setOpen(
                                                            open === log.id
                                                                ? null
                                                                : log.id,
                                                        )
                                                    }
                                                >
                                                    Detail{' '}
                                                    <ChevronDown
                                                        className={cn(
                                                            'transition-transform',
                                                            open === log.id &&
                                                                'rotate-180',
                                                        )}
                                                    />
                                                </Button>
                                            </td>
                                        </tr>
                                        {open === log.id && (
                                            <tr className="bg-muted/30">
                                                <td
                                                    colSpan={6}
                                                    className="px-4 py-3"
                                                >
                                                    <Diff
                                                        before={log.before}
                                                        after={log.after}
                                                    />
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Pagination paginator={logs} />
            </div>
        </>
    );
}
