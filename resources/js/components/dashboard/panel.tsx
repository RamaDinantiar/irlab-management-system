import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useId } from 'react';

/** Panel putih bergaris judul — panel kanan dashboard (Figma) & daftar widget PRD. */
export function DashboardPanel({
    title,
    action,
    empty,
    children,
}: {
    title: string;
    /** Tautan "lihat semua" di kanan judul. */
    action?: { label: string; href: string };
    /** Ditampilkan bila `children` kosong. */
    empty?: string;
    children?: ReactNode;
}) {
    const titleId = useId();
    const isEmpty =
        children === undefined ||
        children === null ||
        (Array.isArray(children) && children.length === 0);

    return (
        <section aria-labelledby={titleId} className="border bg-card">
            <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <h2 id={titleId} className="text-h3 font-bold text-primary-700">
                    {title}
                </h2>
                {action && (
                    <Link
                        href={action.href}
                        prefetch
                        className="shrink-0 text-sm font-medium text-primary-700 underline decoration-primary-200 underline-offset-4 hover:decoration-current"
                    >
                        {action.label}
                    </Link>
                )}
            </div>
            {isEmpty ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">
                    {empty}
                </p>
            ) : (
                <ul className="divide-y divide-primary-50">{children}</ul>
            )}
        </section>
    );
}
