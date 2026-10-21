import { CalendarX } from 'lucide-react';
import { dayOfMonth, formatClock, formatWeekRange } from '@/lib/datetime';
import { scheduleColors } from '@/lib/schedule-colors';
import { cn } from '@/lib/utils';
import type { ScheduleEvent } from '@/types';

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const DAY_NAMES = [
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    "Jum'at",
    'Sabtu',
    'Minggu',
];

function EventBlock({ event }: { event: ScheduleEvent }) {
    const color = scheduleColors[event.color];

    return (
        <div className="flex flex-col gap-1">
            <div
                className={cn(
                    'flex flex-col gap-1 border-l-4 px-1 py-1.5',
                    color.block,
                    color.accent,
                )}
            >
                <span
                    className={cn(
                        'w-fit px-1.5 py-0.5 text-xs font-bold',
                        color.chip,
                        color.text,
                    )}
                >
                    {formatClock(event.start)} – {formatClock(event.end)}
                </span>
                {/* Nama mata kuliah berbahasa Inggris → pemenggalan kata ber-tanda hubung. */}
                <span
                    lang="en"
                    className={cn(
                        'text-xs leading-tight font-bold [overflow-wrap:break-word] hyphens-auto',
                        color.text,
                    )}
                >
                    {event.title}
                </span>
                <span className="text-[11px] leading-tight font-medium">
                    {event.subtitle}
                </span>
                <span className="text-[11px] leading-tight text-black/70">
                    {event.room}
                </span>
            </div>
            {/* Figma: kotak putus-putus "Sesi Praktikum Berjalan" untuk sesi yang sedang berlangsung. */}
            {event.running && (
                <div
                    className={cn(
                        'border border-dashed px-1.5 py-2 text-center text-[11px] leading-tight font-medium',
                        color.running,
                    )}
                >
                    {event.type === 'shift'
                        ? 'Shift Sedang Berjalan'
                        : 'Sesi Praktikum Berjalan'}
                </div>
            )}
        </div>
    );
}

/**
 * Figma "Dashboard" → Schedule: grid hari × slot sesi (baris = jam mulai sesi),
 * blok berwarna per mata kuliah. PRD FR-AD-5: shift ngawas + sesi kelas minggu ini.
 * Di bawah 768px menjadi daftar per hari (PRD FR-PS-02).
 */
export function WeekSchedule({
    weekStart,
    today,
    events,
    title = 'Jadwal Minggu Ini',
}: {
    weekStart: string;
    today: number;
    events: ScheduleEvent[];
    /** Judul kartu, mis. "Jadwal Minggu Depan" saat menavigasi minggu. */
    title?: string;
}) {
    const slots = [...new Set(events.map((event) => event.start))].sort();
    const at = (day: number, slot: string) =>
        events.filter((event) => event.day === day && event.start === slot);

    return (
        <section
            aria-labelledby="week-schedule-title"
            className="border border-primary-200 bg-card"
        >
            <header className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-5 pb-4">
                <h2
                    id="week-schedule-title"
                    className="text-h2 font-bold text-primary-900"
                >
                    {title}
                </h2>
                <p className="font-mono text-sm text-muted-foreground">
                    {formatWeekRange(weekStart)}
                </p>
            </header>

            {events.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-5 pb-10 text-center text-sm text-muted-foreground">
                    <CalendarX
                        className="size-8 text-primary-200"
                        aria-hidden
                    />
                    Tidak ada sesi kelas atau shift pada minggu ini.
                </div>
            ) : (
                <>
                    {/* Desktop & tablet: grid */}
                    <div className="hidden overflow-x-auto md:block">
                        <table className="w-full min-w-[720px] table-fixed border-collapse">
                            <caption className="sr-only">
                                Jadwal sesi kelas dan shift ngawas per hari
                            </caption>
                            <thead>
                                <tr className="border-y border-primary-200">
                                    <th
                                        scope="col"
                                        className="w-16 py-2 pl-5 text-left text-sm font-medium text-muted-foreground"
                                    >
                                        Jam
                                    </th>
                                    {DAYS.map((name, index) => {
                                        const day = index + 1;
                                        const isToday = day === today;

                                        return (
                                            <th
                                                key={name}
                                                scope="col"
                                                aria-current={
                                                    isToday ? 'date' : undefined
                                                }
                                                className={cn(
                                                    'border-l border-primary-200 py-2 text-sm font-bold text-primary-700',
                                                    isToday && 'bg-primary-50',
                                                )}
                                            >
                                                <abbr
                                                    title={DAY_NAMES[index]}
                                                    className="no-underline"
                                                >
                                                    {name}
                                                </abbr>{' '}
                                                <span className="font-mono font-medium">
                                                    {dayOfMonth(weekStart, day)}
                                                </span>
                                                {isToday && (
                                                    <span className="sr-only">
                                                        {' '}
                                                        (hari ini)
                                                    </span>
                                                )}
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {slots.map((slot) => (
                                    <tr
                                        key={slot}
                                        className="border-b border-primary-50 last:border-b-0"
                                    >
                                        <th
                                            scope="row"
                                            className="py-2 pl-5 text-left align-top font-mono text-sm font-medium text-muted-foreground"
                                        >
                                            {formatClock(slot)}
                                        </th>
                                        {DAYS.map((name, index) => {
                                            const day = index + 1;

                                            return (
                                                <td
                                                    key={name}
                                                    className={cn(
                                                        'border-l border-primary-200 px-0.5 py-1 align-top',
                                                        day === today &&
                                                            'bg-primary-50/50',
                                                    )}
                                                >
                                                    <div className="flex flex-col gap-1.5">
                                                        {at(day, slot).map(
                                                            (event) => (
                                                                <EventBlock
                                                                    key={
                                                                        event.id
                                                                    }
                                                                    event={
                                                                        event
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile: daftar per hari */}
                    <ol className="space-y-4 px-4 pb-5 md:hidden">
                        {DAY_NAMES.map((name, index) => {
                            const day = index + 1;
                            const dayEvents = events.filter(
                                (event) => event.day === day,
                            );

                            if (dayEvents.length === 0) {
                                return null;
                            }

                            return (
                                <li key={name}>
                                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-primary-700">
                                        {name}, {dayOfMonth(weekStart, day)}
                                        {day === today && (
                                            <span className="bg-primary-700 px-1.5 py-0.5 text-[11px] text-white">
                                                Hari ini
                                            </span>
                                        )}
                                    </h3>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {dayEvents.map((event) => (
                                            <EventBlock
                                                key={event.id}
                                                event={event}
                                            />
                                        ))}
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </>
            )}
        </section>
    );
}
