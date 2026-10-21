import { Link } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import type { GradingQueueItem } from '@/types';
import { DashboardPanel } from './panel';

/** PRD FR-AD-4: antrian penilaian per kelas (dinilai ÷ terkumpul). */
export function GradingQueue({
    items,
    gradeHref = '/asisten/grade',
}: {
    items: GradingQueueItem[];
    /** Halaman Grade sesuai peran (Asisten / Admin). */
    gradeHref?: string;
}) {
    return (
        <DashboardPanel
            title="Antrian Penilaian"
            action={{ label: 'Buka Penilaian', href: gradeHref }}
            empty="Belum ada submission yang perlu dinilai."
        >
            {items.map((item) => {
                const done = item.graded >= item.submitted;
                const percent =
                    item.submitted > 0
                        ? Math.round((item.graded / item.submitted) * 100)
                        : 100;

                return (
                    <li key={item.id}>
                        <Link
                            href={item.href}
                            prefetch
                            className="block px-5 py-3.5 transition-colors hover:bg-primary-50/60 focus-visible:bg-primary-50 focus-visible:outline-none"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-bold">
                                        {item.course} · {item.className}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {item.task}
                                    </p>
                                </div>
                                {done ? (
                                    <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-success">
                                        <CheckCircle2
                                            className="size-3.5"
                                            aria-hidden
                                        />
                                        Selesai
                                    </span>
                                ) : (
                                    <span className="shrink-0 font-mono text-xs font-bold text-primary-700">
                                        {item.graded}/{item.submitted}
                                    </span>
                                )}
                            </div>
                            <div
                                role="progressbar"
                                aria-label={`${item.task}: ${item.graded} dari ${item.submitted} dinilai`}
                                aria-valuemin={0}
                                aria-valuemax={item.submitted}
                                aria-valuenow={item.graded}
                                className="mt-2 h-1.5 bg-primary-50"
                            >
                                <div
                                    className={
                                        done
                                            ? 'h-full bg-success'
                                            : 'h-full bg-primary'
                                    }
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </Link>
                    </li>
                );
            })}
        </DashboardPanel>
    );
}
