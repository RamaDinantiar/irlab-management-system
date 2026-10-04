import { ScrollText } from 'lucide-react';
import { useNow } from '@/hooks/use-now';
import { formatRelative } from '@/lib/datetime';
import type { AuditLogItem } from '@/types';
import { DashboardPanel } from './panel';

/** FR-ADM-01 & FR-ADM-09: aktivitas audit terbaru (aksi sensitif). */
export function AuditLogFeed({ items }: { items: AuditLogItem[] }) {
    const now = useNow();

    return (
        <DashboardPanel
            title="Aktivitas Audit Terbaru"
            action={{ label: 'Audit log', href: '/admin/audit-logs' }}
            empty="Belum ada aktivitas tercatat."
        >
            {items.map((item) => (
                <li key={item.id} className="flex gap-3 px-5 py-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                        <ScrollText className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm">
                            <span className="font-bold">{item.actor}</span>{' '}
                            {item.action}
                        </p>
                        <p className="font-mono text-xs">{item.target}</p>
                        <time
                            dateTime={item.at}
                            className="font-mono text-xs text-muted-foreground"
                        >
                            {formatRelative(item.at, now)}
                        </time>
                    </div>
                </li>
            ))}
        </DashboardPanel>
    );
}
