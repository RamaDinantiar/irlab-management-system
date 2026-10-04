import { Link } from '@inertiajs/react';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNow } from '@/hooks/use-now';
import { formatRelative } from '@/lib/datetime';
import type { ApprovalRequest } from '@/types';
import { DashboardPanel } from './panel';

/** FR-ADM-03: pengajuan Mata Kuliah/Kelas dari Asisten yang menunggu persetujuan. */
export function ApprovalQueue({ items }: { items: ApprovalRequest[] }) {
    const now = useNow();

    return (
        <DashboardPanel
            title="Antrian Persetujuan"
            action={{ label: 'Semua pengajuan', href: '/admin/courses' }}
            empty="Tidak ada pengajuan yang menunggu persetujuan."
        >
            {items.map((item) => (
                <li
                    key={item.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary">
                                {item.type === 'course'
                                    ? 'Mata Kuliah'
                                    : 'Kelas'}
                            </Badge>
                            <StatusBadge status="pending_approval" />
                        </div>
                        <p className="font-bold">{item.name}</p>
                        <p className="font-mono text-xs">{item.detail}</p>
                        <p className="text-xs text-muted-foreground">
                            Diajukan {item.requestedBy} ·{' '}
                            <time dateTime={item.requestedAt}>
                                {formatRelative(item.requestedAt, now)}
                            </time>
                        </p>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 self-start sm:self-center"
                        asChild
                    >
                        <Link href={item.href} prefetch>
                            Tinjau
                        </Link>
                    </Button>
                </li>
            ))}
        </DashboardPanel>
    );
}
