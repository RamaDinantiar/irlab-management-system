import { Link } from '@inertiajs/react';
import { useNow } from '@/hooks/use-now';
import { formatRelative } from '@/lib/datetime';
import type { FeedbackItem } from '@/types';
import { DashboardPanel } from './panel';

/** PRD FR-PD-5: 3 nilai terakhir yang dipublikasikan + cuplikan feedback. */
export function RecentFeedback({ items }: { items: FeedbackItem[] }) {
    const now = useNow();

    return (
        <DashboardPanel
            title="Feedback Terbaru"
            empty="Belum ada nilai yang dipublikasikan."
        >
            {items.map((item) => (
                <li key={item.id}>
                    <Link
                        href={item.href}
                        prefetch
                        className="block space-y-1 px-5 py-3.5 transition-colors hover:bg-primary-50/60 focus-visible:bg-primary-50 focus-visible:outline-none"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 text-sm">
                                <span className="font-bold">{item.task}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                    {item.course}
                                </span>
                            </p>
                            <span className="shrink-0 border border-primary-200 bg-primary-50 px-1.5 py-0.5 font-mono text-xs font-bold text-primary-700">
                                {item.score}/{item.maxScore}
                            </span>
                        </div>
                        <p className="line-clamp-2 text-sm">“{item.excerpt}”</p>
                        <p className="text-xs text-muted-foreground">
                            {item.grader} ·{' '}
                            <time dateTime={item.gradedAt}>
                                {formatRelative(item.gradedAt, now)}
                            </time>
                        </p>
                    </Link>
                </li>
            ))}
        </DashboardPanel>
    );
}
