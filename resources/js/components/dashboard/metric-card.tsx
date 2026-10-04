import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';

/** Figma "24 Pre/Post-Test belum dinilai": angka besar + label, seluruh kartu bisa diklik. */
export function MetricCard({
    value,
    label,
    href,
}: {
    value: number;
    label: string;
    href: string;
}) {
    return (
        <Link
            href={href}
            prefetch
            className="group relative flex min-h-36 flex-col justify-end gap-1 border bg-card p-5 transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
            <span className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-primary-200 text-primary-900 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="size-5" aria-hidden />
            </span>
            <span className="text-[3rem] leading-none font-bold text-primary">
                {value}
            </span>
            <span className="text-h3 font-bold text-primary">{label}</span>
        </Link>
    );
}
