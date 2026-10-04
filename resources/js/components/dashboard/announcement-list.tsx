import { Pin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNow } from '@/hooks/use-now';
import { formatRelative } from '@/lib/datetime';
import type { Announcement } from '@/types';
import { DashboardPanel } from './panel';

/** PRD FR-PD-6: pengumuman global & per kelas; yang di-pin tampil di atas. */
export function AnnouncementList({ items }: { items: Announcement[] }) {
    const now = useNow();
    const sorted = [...items].sort(
        (a, b) => Number(b.pinned) - Number(a.pinned),
    );

    return (
        <DashboardPanel title="Pengumuman Lab" empty="Belum ada pengumuman.">
            {sorted.map((item) => (
                <li key={item.id} className="space-y-1.5 px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {item.pinned && (
                            <Badge variant="default">
                                <Pin aria-hidden /> Disematkan
                            </Badge>
                        )}
                        <Badge variant="secondary">
                            {item.scope === 'global'
                                ? 'Semua praktikan'
                                : item.className}
                        </Badge>
                    </div>
                    <p className="text-sm font-bold">{item.title}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.body}
                    </p>
                    <time
                        dateTime={item.publishedAt}
                        className="block font-mono text-xs text-muted-foreground"
                    >
                        {formatRelative(item.publishedAt, now)}
                    </time>
                </li>
            ))}
        </DashboardPanel>
    );
}
