import { FileUp, Megaphone, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNow } from '@/hooks/use-now';
import { formatRelative } from '@/lib/datetime';
import type { ActivityItem } from '@/types';
import { DashboardPanel } from './panel';

const ICONS: Record<ActivityItem['type'], LucideIcon> = {
    submission: FileUp,
    enrollment: UserPlus,
    program: Megaphone,
};

/** PRD FR-AD-6: submission masuk, praktikan bergabung, pendaftar program baru. */
export function ActivityFeed({ items }: { items: ActivityItem[] }) {
    const now = useNow();

    return (
        <DashboardPanel title="Aktivitas Terbaru" empty="Belum ada aktivitas.">
            {items.map((item) => {
                const Icon = ICONS[item.type];

                return (
                    <li key={item.id} className="flex gap-3 px-5 py-3.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                            <Icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm">{item.message}</p>
                            <time
                                dateTime={item.at}
                                className="font-mono text-xs text-muted-foreground"
                            >
                                {formatRelative(item.at, now)}
                            </time>
                        </div>
                    </li>
                );
            })}
        </DashboardPanel>
    );
}
