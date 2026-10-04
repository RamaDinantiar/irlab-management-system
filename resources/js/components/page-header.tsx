import type { ReactNode } from 'react';

/** Judul halaman — Figma: "Grade", "Penilaian (Grade)" + deskripsi + aksi di kanan. */
export function PageHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: string;
    actions?: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-4 border-b border-primary-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
                <h1 className="text-h1 font-bold text-primary-900">{title}</h1>
                {description && (
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
}
