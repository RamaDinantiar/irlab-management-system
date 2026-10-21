import { Link } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { confirmLogout } from '@/components/logout-confirm-dialog';
import {
    NavMain,
    sidebarItemClass,
    sidebarLabelClass,
} from '@/components/nav-main';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { useNavigation } from '@/hooks/use-navigation';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { edit as editProfile } from '@/routes/profile';

export function AppSidebar() {
    const groups = useNavigation();
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const cleanup = useMobileNavigation();

    return (
        <Sidebar
            collapsible="icon"
            className="border-r-0 shadow-[4px_0_12px_rgb(0_0_0/0.12)]"
        >
            <SidebarHeader className="px-6 pt-8 pb-6 transition-[padding] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[collapsible=icon]:px-[18px]">
                <Link
                    href={dashboard()}
                    prefetch
                    className="flex items-center gap-3 overflow-hidden rounded-sm focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    aria-label="IR Lab — Dashboard"
                >
                    <AppLogo />
                </Link>
            </SidebarHeader>

            <SidebarContent className="gap-0">
                <NavMain groups={groups} />
            </SidebarContent>

            <SidebarFooter className="px-0 pb-6">
                <SidebarMenu className="gap-1">
                    <SidebarMenuItem className="pl-3">
                        <SidebarMenuButton
                            asChild
                            tooltip={{ children: 'Settings' }}
                            className={cn(
                                sidebarItemClass,
                                isCurrentOrParentUrl('/settings') &&
                                    'text-white',
                            )}
                        >
                            <Link href={editProfile()} prefetch>
                                <Settings aria-hidden />
                                <span className={sidebarLabelClass}>
                                    Settings
                                </span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem className="pl-3">
                        <SidebarMenuButton
                            asChild
                            tooltip={{ children: 'Log out' }}
                            className={sidebarItemClass}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    cleanup();
                                    confirmLogout();
                                }}
                                data-test="logout-button"
                            >
                                <LogOut aria-hidden />
                                <span className={sidebarLabelClass}>
                                    Log out
                                </span>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
