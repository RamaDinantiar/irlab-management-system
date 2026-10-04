import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Empty state wajib di setiap halaman data (PRD 7.4). */
export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-primary-200 bg-white px-6 py-16 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                <Icon className="size-7" aria-hidden />
            </span>
            <h2 className="text-h3 font-bold">{title}</h2>
            {description && (
                <p className="max-w-md text-sm text-muted-foreground">
                    {description}
                </p>
            )}
            {action}
        </div>
    );
}
