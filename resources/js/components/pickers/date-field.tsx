import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDismiss } from '@/hooks/use-dismiss';
import { todayWib } from '@/lib/datetime';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const pad = (n: number) => String(n).padStart(2, '0');
const monthLabel = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
});
const longLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
});

/**
 * Input tanggal bergaya tema (pengganti `<input type="date">` bawaan
 * browser): tombol + kalender kecil, nilai "YYYY-MM-DD". Terkendali lewat
 * `value`/`onChange`, atau mandiri lewat `defaultValue` + `name` di `<Form>`.
 */
export function DateField({
    id,
    name,
    value: controlled,
    defaultValue = '',
    onChange,
    min,
    max,
    invalid,
    required,
    placeholder = 'Pilih tanggal',
}: {
    id?: string;
    /** Nama field form: nilai dikirim lewat input tersembunyi. */
    name?: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    /** "YYYY-MM-DD" — tanggal sebelumnya dinonaktifkan. */
    min?: string;
    /** "YYYY-MM-DD" — tanggal setelahnya dinonaktifkan. */
    max?: string;
    invalid?: boolean;
    required?: boolean;
    placeholder?: string;
}) {
    const [own, setOwn] = useState(defaultValue);
    const value = controlled ?? own;
    const select = (day: string) => {
        setOwn(day);
        onChange?.(day);
    };
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const initial = value || max || todayWib();
    const [view, setView] = useState(() => initial.slice(0, 7));
    const close = useCallback(() => setOpen(false), []);
    useDismiss(root, open, close);

    const [y, m] = view.split('-').map(Number);
    const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const total = new Date(y, m, 0).getDate();
    const shift = (delta: number) => {
        const d = new Date(y, m - 1 + delta, 1);
        setView(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
    };

    return (
        <div ref={root} className="relative">
            {name && (
                <input
                    type="hidden"
                    name={name}
                    value={value}
                    required={required}
                />
            )}
            <button
                id={id}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-invalid={invalid}
                onClick={() => {
                    setView((value || initial).slice(0, 7));
                    setOpen((o) => !o);
                }}
                className={cn(
                    'flex h-10 w-full items-center gap-2 border border-input bg-white px-3 text-left text-sm focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none aria-invalid:border-destructive',
                    open && 'border-primary-500',
                )}
            >
                <CalendarDays
                    className="size-4 shrink-0 text-primary-700"
                    aria-hidden
                />
                <span
                    className={cn(
                        'flex-1 truncate',
                        !value && 'text-muted-foreground',
                    )}
                >
                    {value
                        ? longLabel.format(new Date(`${value}T00:00:00`))
                        : placeholder}
                </span>
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Pilih tanggal"
                    className="absolute top-full left-0 z-50 mt-2 w-72 border border-primary-200 bg-popover p-3 shadow-lg"
                >
                    <div className="mb-2 flex items-center justify-between">
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label="Bulan sebelumnya"
                            onClick={() => shift(-1)}
                            disabled={!!min && `${view}-31` < min}
                        >
                            <ChevronLeft />
                        </Button>
                        <span className="font-bold text-primary-900">
                            {monthLabel.format(new Date(y, m - 1, 1))}
                        </span>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label="Bulan berikutnya"
                            onClick={() => shift(1)}
                            disabled={!!max && `${view}-01` > max}
                        >
                            <ChevronRight />
                        </Button>
                    </div>
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
                        {Array.from({ length: firstWeekday }, (_, i) => (
                            <span key={`e${i}`} />
                        ))}
                        {Array.from({ length: total }, (_, i) => {
                            const day = `${view}-${pad(i + 1)}`;
                            const selected = day === value;
                            const disabled =
                                (!!max && day > max) || (!!min && day < min);

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    disabled={disabled}
                                    aria-pressed={selected}
                                    aria-label={longLabel.format(
                                        new Date(`${day}T00:00:00`),
                                    )}
                                    onClick={() => {
                                        select(day);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        'flex h-8 items-center justify-center text-sm tabular-nums hover:bg-primary-50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none disabled:pointer-events-none disabled:text-muted-foreground/40',
                                        day === max &&
                                            !selected &&
                                            'font-bold text-primary-700 ring-1 ring-primary-500 ring-inset',
                                        selected &&
                                            'bg-primary-700 font-bold text-white hover:bg-primary-700',
                                    )}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
