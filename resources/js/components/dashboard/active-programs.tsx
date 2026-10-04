import { Link } from '@inertiajs/react';
import type { ActiveProgram } from '@/types';
import { DashboardPanel } from './panel';

/** FR-ADM-01: program yang sedang aktif (Workshop, Quick Tutor, Rekrutmen). */
export function ActivePrograms({ items }: { items: ActiveProgram[] }) {
    return (
        <DashboardPanel
            title="Program Aktif"
            empty="Tidak ada program yang sedang berjalan."
        >
            {items.map((item) => (
                <li key={item.id}>
                    <Link
                        href={item.href}
                        prefetch
                        className="block space-y-1 px-5 py-3.5 transition-colors hover:bg-primary-50/60 focus-visible:bg-primary-50 focus-visible:outline-none"
                    >
                        <p className="font-mono text-xs font-bold text-primary-700 uppercase">
                            {item.type} · {item.status}
                        </p>
                        <p className="text-sm font-bold">{item.title}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                            {item.quota === null
                                ? `${item.registered} pendaftar`
                                : `${item.registered}/${item.quota} peserta`}
                        </p>
                    </Link>
                </li>
            ))}
        </DashboardPanel>
    );
}
