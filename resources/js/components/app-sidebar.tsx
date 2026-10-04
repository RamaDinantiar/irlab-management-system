import { Link, router } from '@inertiajs/react';
import { LogOut, Settings } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
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
import { dashboard, logout } from '@/routes';
import { edit as editProfile } from '@/routes/profile';

const footerItemClass =
    'h-11 gap-3 rounded-none px-3 text-h3 font-bold text-white/80 hover:bg-sidebar-accent hover:text-white [&>svg]:size-6! group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center';

export function AppSidebar() {
    const groups = useNavigation();
    const { isCurrentOrParentUrl } = useCurrentUrl();
    const cleanup = useMobileNavigation();

    return (
        <Sidebar
            collapsible="icon"
            className="border-r-0 shadow-[4px_0_12px_rgb(0_0_0/0.12)]"
        >
            <SidebarHeader className="px-6 pt-8 pb-6 group-data-[collapsible=icon]:px-2">
                <Link
                    href={dashboard()}
                    prefetch
                    className="flex items-center gap-3 rounded-sm group-data-[collapsible=icon]:justify-center focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
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
                                footerItemClass,
                                isCurrentOrParentUrl('/settings') &&
                                    'text-white',
                            )}
                        >
                            <Link href={editProfile()} prefetch>
                                <Settings aria-hidden />
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem className="pl-3">
                        <SidebarMenuButton
                            asChild
                            tooltip={{ children: 'Log out' }}
                            className={footerItemClass}
                        >
                            <Link
                                href={logout()}
                                as="button"
                                onClick={() => {
                                    cleanup();
                                    router.flushAll();
                                }}
                                data-test="logout-button"
                            >
                                <LogOut aria-hidden />
                                <span>Log out</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}
