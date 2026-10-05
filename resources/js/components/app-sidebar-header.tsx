import { usePage } from '@inertiajs/react';
import { CalendarRange, ChevronDown } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { GlobalSearch } from '@/components/global-search';
import { NotificationBell } from '@/components/notification-bell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserMenuContent } from '@/components/user-menu-content';
import { findNavTrail, roleLabels } from '@/config/navigation';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { useNavigation } from '@/hooks/use-navigation';
import type { BreadcrumbItem, User } from '@/types';

/** Contoh: "Asisten Lab · Sekretaris" atau "Praktikan · 202331044". */
function userSubtitle(user: User): string {
    const position =
        user.position !== 'none'
            ? user.position[0].toUpperCase() + user.position.slice(1)
            : null;

    return [roleLabels[user.role], position ?? user.nim]
        .filter(Boolean)
        .join(' · ');
}

/**
 * Topbar 64px (PRD 7.3): breadcrumb, notifikasi, profil. Kartu profil mengikuti
 * Figma "Dashboard" (avatar bercincin teal, nama JetBrains Mono).
 */
export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItem[];
}) {
    const { auth, activeSemester } = usePage().props;
    const groups = useNavigation();
    const { currentUrl } = useCurrentUrl();
    const getInitials = useInitials();

    const trail: BreadcrumbItem[] =
        breadcrumbs.length > 0
            ? breadcrumbs
            : findNavTrail(groups, currentUrl).map(({ title, href }) => ({
                  title,
                  href,
              }));

    return (
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-4 border-b border-primary-200 bg-white px-4 md:px-6">
            <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="-ml-1 size-10 text-primary-700" />
                <Breadcrumbs breadcrumbs={trail} />
            </div>

            <div className="flex items-center gap-2">
                {activeSemester && (
                    <span
                        className="hidden items-center gap-1.5 border border-primary-200 bg-primary-50 px-2.5 py-1 font-mono text-xs font-bold text-primary-700 lg:inline-flex"
                        title="Semester aktif"
                    >
                        <CalendarRange className="size-3.5" aria-hidden />
                        <span className="sr-only">Semester aktif: </span>
                        {activeSemester.name}
                    </span>
                )}
                <GlobalSearch />
                <NotificationBell />

                {auth.user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex items-center gap-3 rounded-sm py-1 pr-1 pl-1 text-left hover:bg-primary-50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
                                data-test="sidebar-menu-button"
                            >
                                <Avatar className="size-10 rounded-full ring-2 ring-primary ring-offset-2">
                                    <AvatarImage
                                        src={auth.user.avatar}
                                        alt=""
                                    />
                                    <AvatarFallback className="bg-primary-50 font-bold text-primary-700">
                                        {getInitials(auth.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden max-w-48 sm:grid">
                                    <span className="truncate font-mono text-sm font-bold">
                                        {auth.user.name}
                                    </span>
                                    <span className="truncate font-mono text-xs text-muted-foreground">
                                        {userSubtitle(auth.user)}
                                    </span>
                                </span>
                                <ChevronDown
                                    aria-hidden
                                    className="hidden size-4 text-muted-foreground sm:block"
                                />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="min-w-56" align="end">
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
