import { Megaphone, Pin } from 'lucide-react';
import type { ReactNode } from 'react';
import { Markdown } from '@/components/markdown';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { AnnouncementRow } from '@/types';

const STATUS = {
    live: { label: 'Tayang', variant: 'success' },
    scheduled: { label: 'Terjadwal', variant: 'warning' },
    expired: { label: 'Berakhir', variant: 'muted' },
} as const;

const ROLE_LABEL = {
    praktikan: 'Praktikan',
    asisten: 'Asisten',
    admin: 'Admin',
} as const;

/** Kartu pengumuman (dipin tampil dengan aksen). */
export function AnnouncementCard({
    announcement: a,
    actions,
    showStatus,
}: {
    announcement: AnnouncementRow;
    actions?: ReactNode;
    showStatus?: boolean;
}) {
    return (
        <article
            className={cn(
                'grid gap-3 border bg-card p-5',
                a.pinned && 'border-l-4 border-l-primary-700',
            )}
        >
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                    <h3 className="flex items-center gap-2 font-bold">
                        {a.pinned ? (
                            <Pin
                                className="size-4 text-primary-700"
                                aria-label="Dipin"
                            />
                        ) : (
                            <Megaphone
                                className="size-4 text-muted-foreground"
                                aria-hidden
                            />
                        )}
                        {a.title}
                    </h3>
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge
                            variant={
                                a.scope === 'global' ? 'secondary' : 'outline'
                            }
                        >
                            {a.scope === 'global' ? 'Global' : a.className}
                        </Badge>
                        {a.scope === 'global' && a.targetRoles.length > 0 && (
                            <span>
                                Untuk:{' '}
                                {a.targetRoles
                                    .map((r) => ROLE_LABEL[r])
                                    .join(', ')}
                            </span>
                        )}
                        <span>
                            {a.author ?? 'Admin'} ·{' '}
                            {formatRelative(a.publishAt)}
                        </span>
                        {a.expireAt && (
                            <span>
                                · tayang s.d.{' '}
                                {new Date(a.expireAt).toLocaleDateString(
                                    'id-ID',
                                    {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                    },
                                )}
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {showStatus && (
                        <Badge variant={STATUS[a.status].variant}>
                            {STATUS[a.status].label}
                        </Badge>
                    )}
                    {actions}
                </div>
            </header>
            <Markdown className="text-sm">{a.body}</Markdown>
        </article>
    );
}
