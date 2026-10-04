import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

/** Navigasi halaman untuk paginator Laravel (PRD 8.3: 25 baris per halaman). */
export function Pagination({ paginator }: { paginator: Paginated<unknown> }) {
    if (paginator.last_page <= 1) {
        return null;
    }

    const [previous, ...rest] = paginator.links;
    const next = rest.pop();

    return (
        <nav
            aria-label="Halaman"
            className="flex flex-wrap items-center justify-between gap-3"
        >
            <p className="text-sm text-muted-foreground">
                {paginator.from}–{paginator.to} dari {paginator.total}
            </p>
            <ul className="flex flex-wrap items-center gap-1">
                <li>
                    <PageLink
                        url={previous?.url ?? null}
                        label={
                            <ChevronLeft
                                className="size-4"
                                aria-label="Sebelumnya"
                            />
                        }
                    />
                </li>
                {rest.map((link) => (
                    <li key={link.label}>
                        <PageLink
                            url={link.url}
                            label={link.label}
                            active={link.active}
                        />
                    </li>
                ))}
                <li>
                    <PageLink
                        url={next?.url ?? null}
                        label={
                            <ChevronRight
                                className="size-4"
                                aria-label="Berikutnya"
                            />
                        }
                    />
                </li>
            </ul>
        </nav>
    );
}

function PageLink({
    url,
    label,
    active = false,
}: {
    url: string | null;
    label: React.ReactNode;
    active?: boolean;
}) {
    const className = cn(
        'flex h-9 min-w-9 items-center justify-center border px-2 font-mono text-sm',
        active
            ? 'border-primary-700 bg-primary-700 text-white'
            : 'bg-white hover:bg-primary-50',
        !url && 'pointer-events-none opacity-40',
    );

    if (!url || label === '...') {
        return <span className={className}>{label}</span>;
    }

    return (
        <Link
            href={url}
            preserveScroll
            className={className}
            aria-current={active ? 'page' : undefined}
        >
            {label}
        </Link>
    );
}
