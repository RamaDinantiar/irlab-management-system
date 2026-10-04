import { Link } from '@inertiajs/react';
import { AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardAlert } from '@/types';

const TONES: Record<DashboardAlert['tone'], string> = {
    warning: 'border-warning/30 bg-warning-soft text-warning',
    danger: 'border-danger/30 bg-danger-soft text-danger',
    info: 'border-primary-200 bg-primary-50 text-primary-700',
};

/** PRD FR-AD-2: metrik "perlu tindakan"; tiap chip menuju halaman terfilter. */
export function AlertLinks({ alerts }: { alerts: DashboardAlert[] }) {
    const active = alerts.filter((alert) => alert.count > 0);

    if (active.length === 0) {
        return null;
    }

    return (
        <nav aria-label="Perlu tindakan" className="flex flex-wrap gap-2">
            {active.map((alert) => {
                const Icon = alert.tone === 'info' ? Info : AlertTriangle;

                return (
                    <Link
                        key={alert.key}
                        href={alert.href}
                        prefetch
                        className={cn(
                            'group inline-flex items-center gap-2 border px-3 py-2 text-sm transition-colors hover:brightness-95 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                            TONES[alert.tone],
                        )}
                    >
                        <Icon className="size-4 shrink-0" aria-hidden />
                        <span>
                            <strong className="font-mono">{alert.count}</strong>{' '}
                            {alert.label}
                        </span>
                        <ArrowRight
                            className="size-4 transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                        />
                    </Link>
                );
            })}
        </nav>
    );
}
