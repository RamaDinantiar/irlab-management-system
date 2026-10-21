import { scheduleColors } from '@/lib/schedule-colors';
import { cn } from '@/lib/utils';
import type { ScheduleColor } from '@/types';

export type CourseLegendItem = { name: string; color: ScheduleColor };

/** Satu entri per mata kuliah, urut nama. */
export function courseLegendItems(
    rows: { course: string; color: ScheduleColor }[],
): CourseLegendItem[] {
    const byName = new Map<string, ScheduleColor>();
    rows.forEach((r) => byName.has(r.course) || byName.set(r.course, r.color));

    return [...byName]
        .map(([name, color]) => ({ name, color }))
        .sort((a, b) => a.name.localeCompare(b.name));
}

/** Keterangan warna mata kuliah — Figma "Schedule" (titik warna + nama). */
export function CourseLegend({
    items,
    className,
}: {
    items: CourseLegendItem[];
    className?: string;
}) {
    if (items.length === 0) {
        return null;
    }

    return (
        <ul
            aria-label="Keterangan warna mata kuliah"
            className={cn(
                'flex flex-wrap items-center gap-x-4 gap-y-1.5',
                className,
            )}
        >
            {items.map((item) => (
                <li
                    key={item.name}
                    className="flex items-center gap-1.5 text-xs font-medium"
                >
                    <span
                        aria-hidden
                        className={cn(
                            'size-2.5 shrink-0 rounded-full',
                            scheduleColors[item.color].dot,
                        )}
                    />
                    {item.name}
                </li>
            ))}
        </ul>
    );
}
