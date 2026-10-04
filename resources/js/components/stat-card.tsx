import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Kartu metrik — Figma "Grade Praktikan" (Nilai Akhir 80/100) dan
 * "Dashboard" (24 Pre/Post-Test belum dinilai).
 */
export function StatCard({
    label,
    value,
    suffix,
    footer,
    className,
}: {
    label: string;
    value: ReactNode;
    /** Teks kecil setelah angka, mis. "/100". */
    suffix?: string;
    footer?: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-col gap-2 rounded-lg border bg-card p-4',
                className,
            )}
        >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="flex items-baseline gap-1">
                <span className="text-[2.5rem] leading-none font-bold">
                    {value}
                </span>
                {suffix && (
                    <span className="text-sm text-muted-foreground">
                        {suffix}
                    </span>
                )}
            </p>
            {footer && <div className="mt-auto pt-2 text-xs">{footer}</div>}
        </div>
    );
}
