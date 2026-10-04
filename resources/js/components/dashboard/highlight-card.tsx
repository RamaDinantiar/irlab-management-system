import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

/** Figma "Tulis Laporan Ngawas": kartu aksi utama bergradient teal gelap. */
export function HighlightCard({
    title,
    description,
    href,
    badge,
}: {
    title: string;
    description: string;
    href: string;
    badge?: ReactNode;
}) {
    return (
        <Link
            href={href}
            prefetch
            className="group relative flex min-h-36 flex-col justify-end gap-2 bg-linear-to-r from-primary-900 to-primary p-5 text-white transition-shadow hover:shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
            <span className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full ring-2 ring-white/90 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="size-5" aria-hidden />
            </span>
            {badge}
            <span className="text-h3 font-bold">{title}</span>
            <span className="font-mono text-sm font-medium">{description}</span>
        </Link>
    );
}
