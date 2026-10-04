import { Link } from '@inertiajs/react';
import { AlarmClock } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { useNow } from '@/hooks/use-now';
import { formatCountdown } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { UpcomingTask } from '@/types';
import { DashboardPanel } from './panel';

const DAY_MS = 86_400_000;

/**
 * PRD FR-PD-3: maks. 5 tugas dengan tenggat terdekat, badge status, hitung
 * mundur; merah bila < 24 jam (disertai ikon & teks, bukan hanya warna).
 */
export function UpcomingTasks({ tasks }: { tasks: UpcomingTask[] }) {
    const now = useNow();

    return (
        <DashboardPanel
            title="Tugas Terdekat"
            action={{ label: 'Semua tugas', href: '/praktikan/task' }}
            empty="Tidak ada tugas dengan tenggat dalam waktu dekat."
        >
            {tasks.map((task) => {
                const urgent =
                    task.status === 'not_submitted' &&
                    new Date(task.dueAt).getTime() - now < DAY_MS;

                return (
                    <li key={task.id}>
                        <Link
                            href={task.href}
                            prefetch
                            className="flex items-start justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-primary-50/60 focus-visible:bg-primary-50 focus-visible:outline-none"
                        >
                            <div className="min-w-0 space-y-0.5">
                                <p className="truncate text-sm font-bold">
                                    {task.title}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {task.course}
                                </p>
                                <p
                                    className={cn(
                                        'flex items-center gap-1 font-mono text-xs',
                                        urgent
                                            ? 'font-bold text-danger'
                                            : 'text-foreground',
                                    )}
                                >
                                    <AlarmClock
                                        className="size-3.5"
                                        aria-hidden
                                    />
                                    {urgent && 'Tenggat < 24 jam · '}
                                    {formatCountdown(task.dueAt, now)} lagi
                                </p>
                            </div>
                            <StatusBadge
                                status={task.status}
                                label={
                                    task.status === 'not_submitted'
                                        ? 'Belum'
                                        : undefined
                                }
                                className="shrink-0"
                            />
                        </Link>
                    </li>
                );
            })}
        </DashboardPanel>
    );
}
