import { Link } from '@inertiajs/react';
import type { CourseProgress } from '@/types';
import { DashboardPanel } from './panel';

const score = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

/** PRD FR-PD-4: tugas terkumpul ÷ total dan nilai akhir sementara per mata kuliah. */
export function CourseProgressList({ items }: { items: CourseProgress[] }) {
    return (
        <DashboardPanel
            title="Progres Mata Kuliah"
            action={{ label: 'Lihat nilai', href: '/praktikan/grade' }}
            empty="Belum ada mata kuliah yang diikuti."
        >
            {items.map((item) => {
                const percent =
                    item.total > 0
                        ? Math.round((item.submitted / item.total) * 100)
                        : 0;

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
                                    <p className="font-mono text-xs text-muted-foreground">
                                        {item.submitted}/{item.total} tugas
                                        terkumpul
                                    </p>
                                </div>
                                <p className="shrink-0 text-right">
                                    <span className="block font-mono text-lg leading-none font-bold text-primary-700">
                                        {item.score === null
                                            ? '–'
                                            : score.format(item.score)}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        nilai sementara
                                    </span>
                                </p>
                            </div>
                            <div
                                role="progressbar"
                                aria-label={`${item.course}: ${item.submitted} dari ${item.total} tugas terkumpul`}
                                aria-valuemin={0}
                                aria-valuemax={item.total}
                                aria-valuenow={item.submitted}
                                className="mt-2 h-1.5 bg-primary-50"
                            >
                                <div
                                    className="h-full bg-primary"
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
