import type { InertiaLinkProps } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
    /** Sub-menu, mis. Task → Laporan Praktikum / Post-Test / Pre-Test (Figma). */
    children?: NavItem[];
};

export type NavGroup = {
    /** Judul grup; kosong = tanpa judul. */
    label?: string;
    items: NavItem[];
};
