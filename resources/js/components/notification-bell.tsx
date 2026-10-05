import { Link, router, usePage } from '@inertiajs/react';
import {
    AppWindow,
    Armchair,
    Bell,
    BookOpenCheck,
    CalendarClock,
    CheckCheck,
    ClipboardList,
    FileBarChart,
    FileText,
    Info,
    Megaphone,
    Repeat,
    School,
    ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import NotificationController from '@/actions/App/Http/Controllers/NotificationController';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelative } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { NotificationKind } from '@/types';

export const NOTIFICATION_ICONS: Record<NotificationKind, LucideIcon> = {
    grade: BookOpenCheck,
    task: ClipboardList,
    deadline: CalendarClock,
    seat: Armchair,
    shift: Repeat,
    report: FileText,
    export: FileBarChart,
    approval: ShieldCheck,
    class: School,
    announcement: Megaphone,
    program: AppWindow,
    info: Info,
};

/** Lonceng topbar (PRD 5.x): 8 notifikasi terbaru + tandai semua dibaca. */
export function NotificationBell() {
    const notifications = usePage().props.notifications;
    const unread = notifications?.unread ?? 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative rounded-full"
                    aria-label={
                        unread
                            ? `Notifikasi, ${unread} belum dibaca`
                            : 'Notifikasi'
                    }
                >
                    <Bell className="size-5" />
                    {unread > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] font-bold text-white">
                            {unread > 99 ? '99+' : unread}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[22rem] p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <p className="font-bold">Notifikasi</p>
                    {unread > 0 && (
                        <button
                            type="button"
                            onClick={() =>
                                router.post(
                                    NotificationController.readAll.url(),
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                            className="inline-flex items-center gap-1 text-xs text-primary-700 hover:underline"
                        >
                            <CheckCheck className="size-3.5" aria-hidden />{' '}
                            Tandai semua dibaca
                        </button>
                    )}
                </div>
                {!notifications?.items.length ? (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Belum ada notifikasi.
                    </p>
                ) : (
                    <ul className="max-h-[26rem] overflow-y-auto">
                        {notifications.items.map((n) => {
                            const Icon = NOTIFICATION_ICONS[n.kind] ?? Info;

                            return (
                                <li key={n.id}>
                                    <Link
                                        href={NotificationController.read.url(
                                            n.id,
                                        )}
                                        className={cn(
                                            'flex gap-3 border-b px-4 py-3 text-left hover:bg-primary-50',
                                            !n.read && 'bg-primary-50/60',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
                                                n.read
                                                    ? 'bg-muted text-muted-foreground'
                                                    : 'bg-primary-100 text-primary-800',
                                            )}
                                        >
                                            <Icon
                                                className="size-4"
                                                aria-hidden
                                            />
                                        </span>
                                        <span className="grid min-w-0 gap-0.5">
                                            <span
                                                className={cn(
                                                    'text-sm',
                                                    !n.read && 'font-bold',
                                                )}
                                            >
                                                {n.title}
                                            </span>
                                            <span className="line-clamp-2 text-xs text-muted-foreground">
                                                {n.body}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground">
                                                {formatRelative(n.createdAt)}
                                            </span>
                                        </span>
                                        {!n.read && (
                                            <span
                                                aria-label="Belum dibaca"
                                                className="mt-2 size-2 shrink-0 rounded-full bg-primary-600"
                                            />
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <Link
                    href={NotificationController.index.url()}
                    className="block px-4 py-2.5 text-center text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                    Lihat semua notifikasi &amp; pengumuman
                </Link>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
