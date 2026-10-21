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
import { findNavTrail, positionLabels, roleLabels } from '@/config/navigation';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useInitials } from '@/hooks/use-initials';
import { useNavigation } from '@/hooks/use-navigation';
import type { BreadcrumbItem, User } from '@/types';

/**
 * Contoh: "Asisten Lab · Asisten Umum", "Praktikan · 202331044", atau cukup
 * "Sekretaris/Bendahara" untuk divisi tersebut.
 */
function userSubtitle(user: User): string {
    if (user.role === 'asisten' && user.position === 'sekretaris_bendahara') {
        return positionLabels.sekretaris_bendahara;
    }

    const position =
        user.role === 'asisten' ? positionLabels[user.position] : null;

    return [roleLabels[user.role], position ?? user.nim]
        .filter(Boolean)
        .join(' · ');
}

/**
 * Topbar 64px (PRD 7.3): breadcrumb, notifikasi, profil. Kartu profil mengikuti
 * Figma "Dashboard" (avatar bercincin teal, nama JetBrains Mono). Responsif:
 * semester, kolom cari & nama mulai xl; di layar lebih kecil cari jadi ikon
 * dan nama/semester pindah ke menu akun.
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
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <SidebarTrigger className="-ml-1 size-10 shrink-0 text-primary-700" />
                <span
                    aria-hidden
                    className="hidden h-6 w-px shrink-0 bg-primary-200 sm:block"
                />
                <Breadcrumbs breadcrumbs={trail} />
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2 xl:gap-3">
                {activeSemester && (
                    <span
                        className="hidden items-center gap-2 border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-primary-700 xl:inline-flex"
                        title="Semester aktif"
                    >
                        <CalendarRange className="size-4" aria-hidden />
                        <span className="sr-only">Semester aktif: </span>
                        {activeSemester.name}
                    </span>
                )}
                <GlobalSearch />
                <NotificationBell />

                <span
                    aria-hidden
                    className="mx-1 hidden h-8 w-px bg-primary-200 sm:block"
                />

                {auth.user && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="flex items-center gap-3 rounded-full p-1 text-left hover:bg-primary-50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none xl:rounded-none xl:py-1 xl:pr-2"
                                aria-label={`Menu akun ${auth.user.name}`}
                                data-test="sidebar-menu-button"
                            >
                                <Avatar className="size-9 rounded-full ring-2 ring-primary ring-offset-2">
                                    <AvatarImage
                                        src={auth.user.avatar ?? undefined}
                                        alt=""
                                    />
                                    <AvatarFallback className="bg-primary-50 text-sm font-bold text-primary-700">
                                        {getInitials(auth.user.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="hidden max-w-52 gap-0.5 xl:grid">
                                    <span className="truncate font-mono text-sm leading-tight font-bold">
                                        {auth.user.name}
                                    </span>
                                    <span className="truncate text-xs leading-tight text-muted-foreground">
                                        {userSubtitle(auth.user)}
                                    </span>
                                </span>
                                <ChevronDown
                                    aria-hidden
                                    className="hidden size-4 text-muted-foreground xl:block"
                                />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="min-w-64" align="end">
                            <UserMenuContent
                                user={auth.user}
                                subtitle={userSubtitle(auth.user)}
                                semester={activeSemester?.name}
                            />
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </header>
    );
}
