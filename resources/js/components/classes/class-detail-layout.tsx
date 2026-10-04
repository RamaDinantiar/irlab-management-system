import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import ClassAccessController from '@/actions/App/Http/Controllers/Asisten/ClassAccessController';
import ClassDetailController from '@/actions/App/Http/Controllers/Asisten/ClassDetailController';
import { ClassAccess } from '@/components/classes/class-access';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { formatSchedule } from '@/lib/days';
import { cn } from '@/lib/utils';
import type { ClassRow } from '@/types';

/** FR-AC-02: kerangka detail kelas — header + tab. */
export function ClassDetailLayout({
    klass,
    title,
    children,
}: {
    klass: ClassRow;
    /** Judul tab untuk <title>. */
    title: string;
    children: ReactNode;
}) {
    const { isCurrentUrl } = useCurrentUrl();
    const tabs = [
        {
            label: `Anggota (${klass.membersCount})`,
            href: ClassDetailController.members.url(klass.id),
        },
        {
            label: 'Pertemuan & Modul',
            href: ClassDetailController.meetings.url(klass.id),
        },
        {
            label: 'Presensi',
            href: ClassDetailController.attendance.url(klass.id),
        },
        { label: 'Kursi', href: `/asisten/class/${klass.id}/seats` },
        {
            label: 'Pengaturan',
            href: ClassDetailController.settings.url(klass.id),
        },
    ];

    return (
        <>
            <Head title={`${title} · ${klass.course?.name} ${klass.name}`} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <Link
                    href="/asisten/class"
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
                >
                    <ArrowLeft className="size-4" aria-hidden /> Semua kelas
                </Link>
                <PageHeader
                    title={`${klass.course?.name} · ${klass.name}`}
                    description={`${formatSchedule(klass.dayOfWeek, klass.startTime, klass.endTime)} · ${klass.room?.name} · ${klass.membersCount}/${klass.quota} praktikan`}
                    actions={
                        <ClassAccess
                            klass={klass}
                            tokenAction={ClassAccessController.regenerateToken.form(
                                klass.id,
                            )}
                            lockAction={ClassAccessController.lock.form(
                                klass.id,
                            )}
                        />
                    }
                />
                <nav
                    aria-label="Bagian kelas"
                    className="-mt-2 flex gap-1 overflow-x-auto border-b border-primary-200"
                >
                    {tabs.map((tab) => {
                        const active = isCurrentUrl(tab.href);

                        return (
                            <Link
                                key={tab.href}
                                href={tab.href}
                                prefetch
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'border-b-2 px-4 py-2 text-sm whitespace-nowrap transition-colors',
                                    active
                                        ? 'border-primary-700 font-bold text-primary-700'
                                        : 'border-transparent text-muted-foreground hover:text-primary-700',
                                )}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
                {klass.isLocked && (
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                        <StatusBadge status="locked" /> Praktikan baru tidak
                        dapat bergabung; anggota lama tidak terpengaruh.
                    </p>
                )}
                {children}
            </div>
        </>
    );
}
