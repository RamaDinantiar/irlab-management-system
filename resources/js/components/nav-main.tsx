import { Link } from '@inertiajs/react';
import { ChevronUp } from 'lucide-react';
import { useState } from 'react';
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
import type { NavItem, NavGroup } from '@/types';

/**
 * Figma: menu 20px tebal, ikon 24px, item aktif putih penuh + garis putih di tepi
 * kanan, item lain sedikit redup; sub-menu 14px.
 *
 * Ikon selalu di x=24–48 (pl-3 + px-3), tepat di tengah rel ikon 72px, sehingga
 * saat sidebar dibuka-tutup ikon tidak berpindah; hanya lebar sidebar yang
 * beranimasi dan teks memudar.
 */
export const sidebarItemClass =
    'relative h-11 gap-3 rounded-none px-3 text-h3 font-bold text-white/80 hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-transparent data-[active=true]:font-bold data-[active=true]:text-white [&>svg]:size-6! group-data-[collapsible=icon]:h-11! group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:px-3!';

/** Teks/panah memudar (bukan disembunyikan) agar tidak ada lompatan tata letak. */
export const sidebarLabelClass =
    'whitespace-nowrap transition-opacity duration-200 ease-out group-data-[collapsible=icon]:opacity-0';

const activeBar =
    'after:absolute after:top-1.5 after:right-0 after:bottom-1.5 after:w-1 after:rounded-l-sm after:bg-white';

export function NavMain({ groups }: { groups: NavGroup[] }) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return groups.map((group, index) => (
        <SidebarGroup key={group.label ?? index} className="px-0 py-1">
            {group.label && (
                <SidebarGroupLabel className="px-6 text-xs tracking-wider whitespace-nowrap text-white uppercase">
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
                                        sidebarItemClass,
                                        active && activeBar,
                                    )}
                                >
                                    <Link href={item.href} prefetch>
                                        {item.icon && <item.icon aria-hidden />}
                                        <span className={sidebarLabelClass}>
                                            {item.title}
                                        </span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    }

                    return (
                        <NavParent
                            key={item.title}
                            item={item}
                            active={active}
                        />
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    ));
}

/**
 * Menu bersub-menu. Struktur DOM-nya sama di kedua mode agar transisi mulus:
 * sidebar lebar → sub-menu terbuka-tutup (tinggi beranimasi); sidebar ikon →
 * sub-menu menyusut hilang dan klik ikon membuka dropdown di sampingnya.
 */
function NavParent({ item, active }: { item: NavItem; active: boolean }) {
    const { isCurrentUrl } = useCurrentUrl();
    const { state, isMobile } = useSidebar();
    const iconOnly = state === 'collapsed' && !isMobile;
    // Sub-menu selalu tertutup secara default; dibuka manual oleh pengguna.
    const [open, setOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const children = item.children ?? [];

    return (
        <Collapsible
            asChild
            open={open}
            // Di mode ikon klik membuka dropdown, bukan mengubah sub-menu.
            onOpenChange={(next) => !iconOnly && setOpen(next)}
            className="group/collapsible"
        >
            <SidebarMenuItem className="pl-3">
                <DropdownMenu
                    open={iconOnly && menuOpen}
                    onOpenChange={(next) => setMenuOpen(iconOnly && next)}
                >
                    <DropdownMenuTrigger asChild>
                        <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                                isActive={active}
                                className={cn(
                                    sidebarItemClass,
                                    // Garis aktif di induk selama sub-menu tak terlihat
                                    // (tertutup atau sidebar diciutkan).
                                    active && (!open || iconOnly) && activeBar,
                                )}
                                aria-label={iconOnly ? item.title : undefined}
                            >
                                {item.icon && <item.icon aria-hidden />}
                                <span className={sidebarLabelClass}>
                                    {item.title}
                                </span>
                                <ChevronUp
                                    aria-hidden
                                    className={cn(
                                        'ml-auto size-5! transition-[rotate,opacity] duration-200 group-data-[state=closed]/collapsible:rotate-180',
                                        sidebarLabelClass,
                                    )}
                                />
                            </SidebarMenuButton>
                        </CollapsibleTrigger>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="right"
                        align="start"
                        sideOffset={12}
                        className="min-w-48"
                    >
                        <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {children.map((child) => (
                            <DropdownMenuItem
                                key={child.title}
                                asChild
                                className={cn(
                                    isCurrentUrl(child.href) && 'font-bold',
                                )}
                            >
                                <Link href={child.href} prefetch>
                                    {child.title}
                                </Link>
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    {/* Grid 1fr → 0fr: sub-menu menyusut mulus saat sidebar diciutkan. */}
                    <div className="grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-data-[collapsible=icon]:grid-rows-[0fr] group-data-[collapsible=icon]:opacity-0">
                        <SidebarMenuSub className="mx-0 ml-12 min-h-0 gap-0.5 overflow-hidden border-l-0 px-0 py-0 pr-0 group-data-[collapsible=icon]:flex">
                            {children.map((child) => {
                                const childActive = isCurrentUrl(child.href);

                                return (
                                    <SidebarMenuSubItem key={child.title}>
                                        <SidebarMenuSubButton
                                            asChild
                                            isActive={childActive}
                                            tabIndex={iconOnly ? -1 : undefined}
                                            className={cn(
                                                'relative h-7 rounded-none text-sm whitespace-nowrap text-white hover:bg-sidebar-accent hover:text-white data-[active=true]:bg-transparent data-[active=true]:font-bold data-[active=true]:text-white',
                                                childActive && activeBar,
                                            )}
                                        >
                                            <Link href={child.href} prefetch>
                                                {child.title}
                                            </Link>
                                        </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                );
                            })}
                        </SidebarMenuSub>
                    </div>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}
