import {
    AppWindow,
    Armchair,
    BookOpen,
    CalendarDays,
    CalendarRange,
    ClipboardList,
    FileBarChart,
    FileText,
    House,
    LayoutGrid,
    Library,
    Megaphone,
    School,
    ScrollText,
    SlidersHorizontal,
    SquarePen,
    Users,
} from 'lucide-react';
import type { NavGroup, NavItem, Role } from '@/types';

/**
 * Menu sidebar per peran — PRD 4.2, urutan & nama mengikuti sidebar Figma.
 * Halaman yang belum dibangun diarahkan server ke halaman "Segera hadir".
 */

const taskTypes = (base: string): NavItem[] => [
    { title: 'Laporan Praktikum', href: `${base}/laporan` },
    { title: 'Post-Test', href: `${base}/post-test` },
    { title: 'Pre-Test', href: `${base}/pre-test` },
];

const programs = (base: string, withMaintenance: boolean): NavItem[] => [
    { title: 'Workshop', href: `${base}/workshop` },
    { title: 'Recruitment', href: `${base}/recruitment` },
    { title: 'Quick Tutor', href: `${base}/quick-tutor` },
    ...(withMaintenance
        ? [{ title: 'Maintenance', href: `${base}/maintenance` }]
        : []),
];

/** Menu Asisten; dipakai juga oleh Admin (FR-ADM-11). */
const asistenItems = (p: string): NavItem[] => [
    { title: 'Schedule', href: `${p}/schedule`, icon: CalendarDays },
    { title: 'Class', href: `${p}/class`, icon: BookOpen },
    {
        title: 'Task',
        href: `${p}/task`,
        icon: ClipboardList,
        children: taskTypes(`${p}/task`),
    },
    {
        title: 'Grade',
        href: `${p}/grade`,
        icon: SquarePen,
        children: taskTypes(`${p}/grade`),
    },
    { title: 'Report', href: `${p}/report`, icon: FileText },
    { title: 'Generate', href: `${p}/generate`, icon: FileBarChart },
    {
        title: 'Program',
        href: `${p}/program`,
        icon: AppWindow,
        children: programs(`${p}/program`, true),
    },
    { title: 'Seats', href: `${p}/seats`, icon: Armchair },
];

export const navigation: Record<Role, NavGroup[]> = {
    praktikan: [
        {
            items: [
                {
                    title: 'Dashboard',
                    href: '/praktikan/dashboard',
                    icon: House,
                },
                {
                    title: 'Schedule',
                    href: '/praktikan/schedule',
                    icon: CalendarDays,
                },
                {
                    title: 'Task',
                    href: '/praktikan/task',
                    icon: ClipboardList,
                    children: taskTypes('/praktikan/task'),
                },
                { title: 'Grade', href: '/praktikan/grade', icon: SquarePen },
                { title: 'Class', href: '/praktikan/class', icon: BookOpen },
                { title: 'Seats', href: '/praktikan/seats', icon: Armchair },
                {
                    title: 'Program',
                    href: '/praktikan/program',
                    icon: AppWindow,
                    children: programs('/praktikan/program', false),
                },
            ],
        },
    ],
    asisten: [
        {
            items: [
                {
                    title: 'Dashboard',
                    href: '/asisten/dashboard',
                    icon: House,
                },
                ...asistenItems('/asisten'),
            ],
        },
    ],
    admin: [
        {
            items: [
                { title: 'Dashboard', href: '/admin/dashboard', icon: House },
            ],
        },
        {
            label: 'Master Data',
            items: [
                {
                    title: 'Semester',
                    href: '/admin/semesters',
                    icon: CalendarRange,
                },
                { title: 'Mata Kuliah', href: '/admin/courses', icon: Library },
                {
                    title: 'Kelas & Jadwal',
                    href: '/admin/classes',
                    icon: School,
                },
                {
                    title: 'Ruang & Denah',
                    href: '/admin/rooms',
                    icon: LayoutGrid,
                },
                {
                    title: 'Kontrak Kursi',
                    href: '/admin/seat-contracts',
                    icon: Armchair,
                },
                { title: 'Pengguna', href: '/admin/users', icon: Users },
                {
                    title: 'Pengumuman',
                    href: '/admin/announcements',
                    icon: Megaphone,
                },
                {
                    title: 'Audit Log',
                    href: '/admin/audit-logs',
                    icon: ScrollText,
                },
                {
                    title: 'Pengaturan Sistem',
                    href: '/admin/system-settings',
                    icon: SlidersHorizontal,
                },
            ],
        },
        // FR-ADM-11: halaman akademik bersama Asisten (Admin melihat semua kelas).
        { label: 'Akademik', items: asistenItems('/asisten') },
    ],
};

export const roleLabels: Record<Role, string> = {
    praktikan: 'Praktikan',
    asisten: 'Asisten Lab',
    admin: 'Admin',
};

/**
 * Jejak menu untuk URL saat ini, mis. ['Grade', 'Post-Test'] — dasar breadcrumb
 * otomatis (PRD 5.6).
 */
export function findNavTrail(groups: NavGroup[], url: string): NavItem[] {
    const path = url.split('?')[0];
    const matches = (item: NavItem) =>
        typeof item.href === 'string' &&
        (path === item.href || path.startsWith(`${item.href}/`));

    for (const group of groups) {
        for (const item of group.items) {
            const child = item.children?.find(matches);

            if (child) {
                return [item, child];
            }

            if (matches(item)) {
                return [item];
            }
        }
    }

    return [];
}
