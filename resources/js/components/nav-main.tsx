import { Link } from '@inertiajs/react';
import { ChevronUp } from 'lucide-react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import type { NavGroup } from '@/types';

/**
 * Figma: menu 20px tebal, ikon 24px, item aktif putih penuh + garis putih di tepi
 * kanan, item lain sedikit redup; sub-menu 14px.
 */
const itemClass =
    'relative h-11 gap-3 rounded-none px-3 text-h3 font-bold text-white/80 hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-transparent data-[active=true]:font-bold data-[active=true]:text-white [&>svg]:size-6! group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center';

/** Label & panah disembunyikan saat sidebar diciutkan agar ikon tetap terlihat. */
const labelClass = 'group-data-[collapsible=icon]:hidden';

const activeBar =
    'after:absolute after:top-1.5 after:right-0 after:bottom-1.5 after:w-1 after:rounded-l-sm after:bg-white';

export function NavMain({ groups }: { groups: NavGroup[] }) {
    const { isCurrentUrl, isCurrentOrParentUrl } = useCurrentUrl();
    const { state, isMobile } = useSidebar();
    const iconOnly = state === 'collapsed' && !isMobile;

    return groups.map((group, index) => (
        <SidebarGroup key={group.label ?? index} className="px-0 py-1">
            {group.label && (
                <SidebarGroupLabel className="px-6 text-xs tracking-wider text-white uppercase">
                    {group.label}
                </SidebarGroupLabel>
            )}
            <SidebarMenu className="gap-1">
                {group.items.map((item) => {
                    const active = isCurrentOrParentUrl(item.href);

                    if (!item.children?.length) {
                        return (
                            <SidebarMenuItem key={item.title} className="pl-3">
                                <SidebarMenuButton
                                    asChild
                                    isActive={active}
                                    tooltip={{ children: item.title }}
                                    className={cn(
                                        itemClass,
                                        active && activeBar,
                                    )}
                                >
                                    <Link href={item.href} prefetch>
                                        {item.icon && <item.icon aria-hidden />}
                                        <span className={labelClass}>
                                            {item.title}
                                        </span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    }

                    // Sidebar ikon: sub-menu tidak bisa terbuka di dalam rel 44px,
                    // jadi ditampilkan sebagai dropdown di samping ikon.
                    if (iconOnly) {
                        return (
                            <SidebarMenuItem key={item.title} className="pl-3">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuButton
                                            isActive={active}
                                            className={cn(
                                                itemClass,
                                                active && activeBar,
                                            )}
                                            aria-label={item.title}
                                        >
                                            {item.icon && (
                                                <item.icon aria-hidden />
                                            )}
                                            <span className={labelClass}>
                                                {item.title}
                                            </span>
                                        </SidebarMenuButton>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        side="right"
                                        align="start"
                                        className="min-w-48"
                                    >
                                        <DropdownMenuLabel>
                                            {item.title}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {item.children.map((child) => (
                                            <DropdownMenuItem
                                                key={child.title}
                                                asChild
                                                className={cn(
                                                    isCurrentUrl(child.href) &&
                                                        'font-bold',
                                                )}
                                            >
                                                <Link
                                                    href={child.href}
                                                    prefetch
                                                >
                                                    {child.title}
                                                </Link>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </SidebarMenuItem>
                        );
                    }

                    return (
                        <Collapsible
                            key={item.title}
                            asChild
                            // Figma: sub-menu terbuka. Menu Admin yang panjang (bergrup) hanya
                            // membuka sub-menu yang sedang aktif.
                            defaultOpen={active || !group.label}
                            className="group/collapsible"
                        >
                            <SidebarMenuItem className="pl-3">
                                <CollapsibleTrigger asChild>
                                    <SidebarMenuButton
                                        isActive={active}
                                        tooltip={{ children: item.title }}
                                        className={itemClass}
                                    >
                                        {item.icon && <item.icon aria-hidden />}
                                        <span className={labelClass}>
                                            {item.title}
                                        </span>
                                        <ChevronUp
                                            aria-hidden
                                            className="ml-auto size-5! transition-transform group-data-[collapsible=icon]:hidden group-data-[state=closed]/collapsible:rotate-180"
                                        />
                                    </SidebarMenuButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                    <SidebarMenuSub className="mx-0 ml-12 gap-0.5 border-l-0 px-0 pr-0">
                                        {item.children.map((child) => {
                                            const childActive = isCurrentUrl(
                                                child.href,
                                            );

                                            return (
                                                <SidebarMenuSubItem
                                                    key={child.title}
                                                >
                                                    <SidebarMenuSubButton
                                                        asChild
                                                        isActive={childActive}
                                                        className={cn(
                                                            'relative h-7 rounded-none text-sm text-white hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-transparent data-[active=true]:font-bold data-[active=true]:text-white',
                                                            childActive &&
                                                                activeBar,
                                                        )}
                                                    >
                                                        <Link
                                                            href={child.href}
                                                            prefetch
                                                        >
                                                            {child.title}
                                                        </Link>
                                                    </SidebarMenuSubButton>
                                                </SidebarMenuSubItem>
                                            );
                                        })}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    ));
}
