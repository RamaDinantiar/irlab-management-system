import { Head, Link, router } from '@inertiajs/react';
import { Bell, CheckCheck, Info } from 'lucide-react';
import { useState } from 'react';
import NotificationController from '@/actions/App/Http/Controllers/NotificationController';
import { AnnouncementCard } from '@/components/announcements/announcement-card';
import { EmptyState } from '@/components/empty-state';
import { NOTIFICATION_ICONS } from '@/components/notification-bell';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import { formatRelative } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { AnnouncementRow, NotificationItem, Paginated } from '@/types';

/** Pusat notifikasi + pengumuman yang sedang tayang (semua peran). */
export default function Notifications({
    feed: notifications,
    announcements,
}: {
    feed: Paginated<NotificationItem>;
    announcements: AnnouncementRow[];
}) {
    const [tab, setTab] = useState<'notifications' | 'announcements'>(
        'notifications',
    );
    const unread = notifications.data.some((n) => !n.read);

    return (
        <>
            <Head title="Notifikasi" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Notifikasi & Pengumuman"
                    description="Pembaruan tugas, nilai, jadwal, dan pengumuman laboratorium."
                    actions={
                        unread && (
                            <Button
                                variant="outline"
                                onClick={() =>
                                    router.post(
                                        NotificationController.readAll.url(),
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                <CheckCheck /> Tandai semua dibaca
                            </Button>
                        )
                    }
                />
                <div
                    role="tablist"
                    className="flex gap-6 border-b border-primary-200"
                >
                    {(
                        [
                            ['notifications', 'Notifikasi'],
                            [
                                'announcements',
                                `Pengumuman (${announcements.length})`,
                            ],
                        ] as const
                    ).map(([value, label]) => (
                        <button
                            key={value}
                            role="tab"
                            aria-selected={tab === value}
                            onClick={() => setTab(value)}
                            className={cn(
                                '-mb-px border-b-2 px-1 pb-2.5 text-sm font-bold',
                                tab === value
                                    ? 'border-primary-700 text-primary-800'
                                    : 'border-transparent text-muted-foreground',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'notifications' ? (
                    notifications.data.length === 0 ? (
                        <EmptyState icon={Bell} title="Belum ada notifikasi" />
                    ) : (
                        <>
                            <ul className="divide-y border bg-card">
                                {notifications.data.map((n) => {
                                    const Icon =
                                        NOTIFICATION_ICONS[n.kind] ?? Info;

                                    return (
                                        <li key={n.id}>
                                            <Link
                                                href={NotificationController.read.url(
                                                    n.id,
                                                )}
                                                className={cn(
                                                    'flex flex-wrap gap-x-4 gap-y-1 px-4 py-4 hover:bg-primary-50 sm:flex-nowrap sm:px-5',
                                                    !n.read &&
                                                        'bg-primary-50/60',
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        'flex size-10 shrink-0 items-center justify-center rounded-full',
                                                        n.read
                                                            ? 'bg-muted text-muted-foreground'
                                                            : 'bg-primary-100 text-primary-800',
                                                    )}
                                                >
                                                    <Icon
                                                        className="size-5"
                                                        aria-hidden
                                                    />
                                                </span>
                                                <span className="grid min-w-0 flex-1 gap-0.5">
                                                    <span
                                                        className={cn(
                                                            !n.read &&
                                                                'font-bold',
                                                        )}
                                                    >
                                                        {n.title}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">
                                                        {n.body}
                                                    </span>
                                                </span>
                                                {/* HP: waktu turun ke bawah isi agar teks tidak terjepit. */}
                                                <span className="w-full shrink-0 pl-14 text-xs text-muted-foreground sm:w-auto sm:pl-0">
                                                    {formatRelative(
                                                        n.createdAt,
                                                    )}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                            <Pagination paginator={notifications} />
                        </>
                    )
                ) : announcements.length === 0 ? (
                    <EmptyState icon={Bell} title="Tidak ada pengumuman" />
                ) : (
                    <div className="grid gap-4">
                        {announcements.map((a) => (
                            <AnnouncementCard key={a.id} announcement={a} />
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
