import { useState } from 'react';
import { DateField } from '@/components/pickers/date-field';
import { TimeField } from '@/components/pickers/time-field';
import { todayWib } from '@/lib/datetime';

/**
 * Tanggal + jam bergaya tema (pengganti `<input type="datetime-local">`).
 * Nilai "YYYY-MM-DDTHH:MM" (WIB), dikirim lewat input tersembunyi `name`.
 */
export function DateTimeField({
    id,
    name,
    value: controlled,
    defaultValue = '',
    onChange,
    label,
    invalid,
    required,
    defaultTime = '08:00',
}: {
    id?: string;
    name?: string;
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    /** Nama aksesibel jam, mis. "Jam buka". */
    label: string;
    invalid?: boolean;
    required?: boolean;
    /** Jam yang dipakai saat tanggal dipilih lebih dulu. */
    defaultTime?: string;
}) {
    const [own, setOwn] = useState(defaultValue);
    const value = controlled ?? own;
    const [date, time] = value
        ? [value.slice(0, 10), value.slice(11, 16)]
        : ['', ''];
    const change = (nextDate: string, nextTime: string) => {
        const next = nextDate ? `${nextDate}T${nextTime || defaultTime}` : '';
        setOwn(next);
        onChange?.(next);
    };

    return (
        <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-2">
            {name && (
                <input
                    type="hidden"
                    name={name}
                    value={value}
                    required={required}
                />
            )}
            <DateField
                id={id}
                placeholder="Tanggal"
                value={date}
                onChange={(d) => change(d, time)}
                invalid={invalid}
            />
            <TimeField
                value={time}
                onChange={(t) => change(date || todayWib(), t)}
                label={label}
                invalid={invalid}
                minuteStep={1}
            />
        </div>
    );
}
