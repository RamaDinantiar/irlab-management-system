import { Clock } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useDismiss } from '@/hooks/use-dismiss';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const minutes = (step: number) =>
    Array.from({ length: 60 / step }, (_, i) =>
        String(i * step).padStart(2, '0'),
    );

/**
 * Input jam bergaya tema (pengganti `<input type="time">` bawaan browser):
 * ketuk jam lalu menit (kelipatan `minuteStep`). Nilai "HH:MM" (24 jam, WIB).
 * Terkendali lewat `value`/`onChange`, atau mandiri lewat `defaultValue` + `name`.
 */
export function TimeField({
    id,
    name,
    value: controlled,
    defaultValue = '',
    onChange,
    label,
    invalid,
    required,
    minuteStep = 5,
}: {
    id?: string;
    /** Nama field form: nilai dikirim lewat input tersembunyi. */
    name?: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    /** Nama aksesibel, mis. "Jam mulai". */
    label: string;
    invalid?: boolean;
    required?: boolean;
    /** 5 untuk jadwal kelas; 1 untuk tenggat seperti 23.59. */
    minuteStep?: 1 | 5;
}) {
    const [own, setOwn] = useState(defaultValue);
    const value = (controlled ?? own).slice(0, 5);
    const change = (next: string) => {
        setOwn(next);
        onChange?.(next);
    };
    const MINUTES = minutes(minuteStep);
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const close = useCallback(() => setOpen(false), []);
    useDismiss(root, open, close);
    const [hour, minute] = value ? value.split(':') : ['', ''];

    const cell = (selected: boolean) =>
        cn(
            'h-8 text-sm tabular-nums hover:bg-primary-50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
            selected &&
                'bg-primary-700 font-bold text-white hover:bg-primary-700',
        );

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
                aria-label={`${label}${value ? `: ${value.replace(':', '.')}` : ''}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-invalid={invalid}
                onClick={() => setOpen((o) => !o)}
                className={cn(
                    'flex h-10 w-full items-center gap-2 border border-input bg-white px-3 text-left text-sm tabular-nums focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25 focus-visible:outline-none aria-invalid:border-destructive',
                    open && 'border-primary-500',
                )}
            >
                <Clock
                    className="size-4 shrink-0 text-primary-700"
                    aria-hidden
                />
                <span className={cn(!value && 'text-muted-foreground')}>
                    {value ? value.replace(':', '.') : '--.--'}
                </span>
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label={label}
                    className="absolute top-full left-0 z-50 mt-2 grid w-72 gap-3 border border-primary-200 bg-popover p-3 shadow-lg"
                >
                    <div className="grid gap-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                            Jam
                        </p>
                        <div className="grid grid-cols-6 gap-1">
                            {HOURS.map((h) => (
                                <button
                                    key={h}
                                    type="button"
                                    aria-pressed={h === hour}
                                    onClick={() =>
                                        change(`${h}:${minute || '00'}`)
                                    }
                                    className={cell(h === hour)}
                                >
                                    {h}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid gap-1.5 border-t pt-3">
                        <p className="text-xs font-medium text-muted-foreground">
                            Menit
                        </p>
                        <div
                            className={cn(
                                'grid gap-1',
                                minuteStep === 1
                                    ? 'max-h-48 grid-cols-10 overflow-y-auto'
                                    : 'grid-cols-6',
                            )}
                        >
                            {MINUTES.map((mm) => (
                                <button
                                    key={mm}
                                    type="button"
                                    aria-pressed={mm === minute}
                                    onClick={() => {
                                        change(`${hour || '07'}:${mm}`);
                                        setOpen(false);
                                    }}
                                    className={cell(mm === minute)}
                                >
                                    {mm}
                                </button>
                            ))}
                        </div>
                    </div>
                    {value && !MINUTES.includes(minute) && (
                        <p className="text-xs text-muted-foreground">
                            Nilai saat ini {value.replace(':', '.')} — pilih
                            menit untuk menggantinya.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
