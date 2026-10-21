import { Clock } from 'lucide-react';
import { dayName } from '@/lib/days';
import { scheduleColors } from '@/lib/schedule-colors';
import { cn } from '@/lib/utils';
import type { AllClassRow } from '@/types';

/**
 * Semua kelas di lab, dikelompokkan per hari (Figma "Schedule" › Semua
 * Jadwal). Dipakai Asisten (dengan filter hari) dan Praktikan.
 */
export function ClassesByDay({ rows }: { rows: AllClassRow[] }) {
    const byDay = [
        ...rows
            .reduce(
                (days, c) =>
                    days.set(c.dayOfWeek, [
                        ...(days.get(c.dayOfWeek) ?? []),
                        c,
                    ]),
                new Map<number, AllClassRow[]>(),
            )
            .entries(),
    ].sort(([a], [b]) => a - b);

    return (
        <>
            {byDay.map(([d, rows]) => (
                <section
                    key={d}
                    aria-labelledby={`day-${d}`}
                    className="grid gap-4"
                >
                    <header className="flex flex-wrap items-center justify-between gap-3 border border-primary-200 bg-primary-50 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <span className="flex size-9 items-center justify-center bg-primary-800 font-mono text-xs font-bold text-white">
                                {dayName(d).slice(0, 2).toUpperCase()}
                            </span>
                            <div>
                                <h2
                                    id={`day-${d}`}
                                    className="font-bold uppercase"
                                >
                                    {dayName(d)}
                                </h2>
                                <p className="text-xs">
                                    {rows.length} Sesi Praktikum ·{' '}
                                    {rows.reduce(
                                        (sum, r) => sum + r.credits,
                                        0,
                                    )}{' '}
                                    SKS Total
                                </p>
                            </div>
                        </div>
                        <span className="border bg-white px-6 py-1 text-xs">
                            {[
                                ...new Set(
                                    rows.map((r) => r.room).filter(Boolean),
                                ),
                            ].join(', ')}
                        </span>
                    </header>
                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {rows.map((c) => {
                            const color = scheduleColors[c.color];

                            return (
                                <li
                                    key={c.id}
                                    className={cn(
                                        'grid gap-3 border-l-4 bg-card p-4 shadow-sm',
                                        color.accent,
                                        c.mine && 'ring-2 ring-primary-500',
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1 px-2 py-0.5 font-mono text-xs font-bold',
                                                color.chip,
                                                color.text,
                                            )}
                                        >
                                            <Clock
                                                className="size-3"
                                                aria-hidden
                                            />{' '}
                                            {c.startTime}–{c.endTime}
                                        </span>
                                        <span className="bg-primary-50 px-2 py-0.5 text-[11px] text-primary-800">
                                            {c.credits} SKS
                                        </span>
                                    </div>
                                    <p className="text-h3 leading-tight font-bold">
                                        {c.course}
                                    </p>
                                    <p className="flex items-center gap-2 text-xs">
                                        <span className="bg-primary-50 px-2 py-1">
                                            {c.name}
                                        </span>
                                        <span className="font-mono text-muted-foreground">
                                            {c.code}
                                        </span>
                                        {c.room && <span>· {c.room}</span>}
                                    </p>
                                    <div className="grid gap-1 border-t pt-2">
                                        <span className="text-[11px] text-muted-foreground">
                                            Asisten Laboratorium:
                                        </span>
                                        <span className="flex flex-wrap gap-1">
                                            {c.assistants.map((a) => (
                                                <span
                                                    key={a}
                                                    className="bg-primary-100 px-2 py-0.5 text-[11px]"
                                                >
                                                    {a}
                                                </span>
                                            ))}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ))}
        </>
    );
}
