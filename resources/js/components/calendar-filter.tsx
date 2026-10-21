import {
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDismiss } from '@/hooks/use-dismiss';
import { todayWib } from '@/lib/datetime';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agu',
    'Sep',
    'Okt',
    'Nov',
    'Des',
];

const pad = (n: number) => String(n).padStart(2, '0');
const monthKey = (y: number, m: number) => `${y}-${pad(m)}`;
const monthLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
});
const dayLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

/** Hari ini menurut WIB, "YYYY-MM-DD". */
/**
 * Filter bulan & tanggal berbentuk kalender (tap, tanpa scroll): panah ganti
 * bulan, klik judul untuk memilih bulan, titik = tanggal yang punya data.
 */
export function CalendarFilter({
    month,
    date,
    markedDates = [],
    onSelectMonth,
    onSelectDate,
}: {
    /** "YYYY-MM". */
    month: string;
    /** "YYYY-MM-DD" atau null = semua tanggal di bulan itu. */
    date: string | null;
    markedDates?: string[];
    onSelectMonth: (month: string) => void;
    onSelectDate: (date: string | null) => void;
}) {
    const [open, setOpen] = useState(false);
    const [view, setView] = useState<'days' | 'months'>('days');
    const [year, month1] = month.split('-').map(Number);
    const [pickerYear, setPickerYear] = useState(year);
    const root = useRef<HTMLDivElement>(null);
    const today = todayWib();
    const marked = new Set(markedDates);

    const close = useCallback(() => setOpen(false), []);
    useDismiss(root, open, close);

    const shift = (delta: number) => {
        const d = new Date(year, month1 - 1 + delta, 1);
        onSelectMonth(monthKey(d.getFullYear(), d.getMonth() + 1));
    };

    // Grid Senin-awal: sel kosong sebelum tanggal 1.
    const firstWeekday = (new Date(year, month1 - 1, 1).getDay() + 6) % 7;
    const total = new Date(year, month1, 0).getDate();
    const cells = [
        ...Array.from({ length: firstWeekday }, () => null),
        ...Array.from({ length: total }, (_, i) => i + 1),
    ];

    const label = date
        ? dayLabel.format(new Date(`${date}T00:00:00`))
        : `${monthLabel.format(new Date(year, month1 - 1, 1))} · Semua tanggal`;

    return (
        <div ref={root} className="relative">
            <button
                type="button"
                onClick={() => {
                    setView('days');
                    setPickerYear(year);
                    setOpen((o) => !o);
                }}
                aria-expanded={open}
                aria-haspopup="dialog"
                className={cn(
                    'flex h-10 items-center gap-2 border border-input bg-white px-3 text-sm font-medium hover:border-primary-500 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                    open && 'border-primary-500',
                )}
            >
                <CalendarDays
                    className="size-4 shrink-0 text-primary-700"
                    aria-hidden
                />
                <span className="sr-only">Filter tanggal: </span>
                {label}
                <ChevronDown
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                />
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Pilih tanggal"
                    className="absolute top-full right-0 z-50 mt-2 w-80 border border-primary-200 bg-popover p-4 shadow-lg"
                >
                    <div className="mb-3 flex items-center justify-between">
                        <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label={
                                view === 'days'
                                    ? 'Bulan sebelumnya'
                                    : 'Tahun sebelumnya'
                            }
                            onClick={() =>
                                view === 'days'
                                    ? shift(-1)
                                    : setPickerYear((y) => y - 1)
                            }
                        >
                            <ChevronLeft />
                        </Button>
                        <button
                            type="button"
                            onClick={() =>
                                setView((v) =>
                                    v === 'days' ? 'months' : 'days',
                                )
                            }
                            className="px-2 py-1 font-bold text-primary-900 hover:bg-primary-50"
                            aria-label={
                                view === 'days'
                                    ? 'Pilih bulan'
                                    : 'Kembali ke tanggal'
                            }
                        >
                            {view === 'days'
                                ? monthLabel.format(
                                      new Date(year, month1 - 1, 1),
                                  )
                                : pickerYear}
                        </button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label={
                                view === 'days'
                                    ? 'Bulan berikutnya'
                                    : 'Tahun berikutnya'
                            }
                            onClick={() =>
                                view === 'days'
                                    ? shift(1)
                                    : setPickerYear((y) => y + 1)
                            }
                        >
                            <ChevronRight />
                        </Button>
                    </div>

                    {view === 'days' ? (
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {WEEKDAYS.map((w) => (
                                <span
                                    key={w}
                                    aria-hidden
                                    className="py-1 text-xs font-medium text-muted-foreground"
                                >
                                    {w}
                                </span>
                            ))}
                            {cells.map((day, i) => {
                                if (day === null) {
                                    return <span key={`e${i}`} />;
                                }

                                const value = `${month}-${pad(day)}`;
                                const selected = value === date;

                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => {
                                            onSelectDate(
                                                selected ? null : value,
                                            );
                                            setOpen(false);
                                        }}
                                        aria-pressed={selected}
                                        aria-label={`${dayLabel.format(new Date(`${value}T00:00:00`))}${marked.has(value) ? ', ada laporan' : ''}`}
                                        className={cn(
                                            'relative flex h-9 items-center justify-center text-sm tabular-nums hover:bg-primary-50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                                            value === today &&
                                                !selected &&
                                                'font-bold text-primary-700 ring-1 ring-primary-500 ring-inset',
                                            selected &&
                                                'bg-primary-700 font-bold text-white hover:bg-primary-700',
                                        )}
                                    >
                                        {day}
                                        {marked.has(value) && (
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'absolute bottom-1 size-1 rounded-full',
                                                    selected
                                                        ? 'bg-white'
                                                        : 'bg-primary-500',
                                                )}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {MONTHS.map((name, i) => {
                                const value = monthKey(pickerYear, i + 1);
                                const selected = value === month;

                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        aria-pressed={selected}
                                        onClick={() => {
                                            onSelectMonth(value);
                                            setView('days');
                                        }}
                                        className={cn(
                                            'h-10 border text-sm hover:bg-primary-50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                                            selected &&
                                                'border-primary-700 bg-primary-700 font-bold text-white hover:bg-primary-700',
                                        )}
                                    >
                                        {name}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span
                                aria-hidden
                                className="size-1.5 rounded-full bg-primary-500"
                            />
                            Ada laporan
                        </span>
                        <div className="flex gap-1">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                    onSelectDate(null);
                                    setOpen(false);
                                }}
                            >
                                Semua tanggal
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    onSelectDate(today);
                                    setOpen(false);
                                }}
                            >
                                Hari ini
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
