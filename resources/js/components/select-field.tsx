import type { ReactNode } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/** Radix menolak value '' — opsi kosong ("Semua", "—") memakai penanda ini. */
const EMPTY = '__empty__';

export type SelectFieldOption = {
    value: string | number;
    label: ReactNode;
    disabled?: boolean;
};

/**
 * Dropdown standar aplikasi (pengganti `<select>` bawaan browser), dengan
 * API mirip `<select>`: nilai '' berarti kosong. Opsi bernilai '' tetap
 * bisa dipilih; tanpa opsi itu, nilai '' menampilkan `placeholder`.
 */
export function SelectField({
    id,
    value,
    onValueChange,
    options,
    placeholder,
    required,
    disabled,
    size = 'default',
    className,
    contentClassName,
    'aria-label': ariaLabel,
    'aria-invalid': ariaInvalid,
}: {
    id?: string;
    value: string | number | null | undefined;
    onValueChange: (value: string) => void;
    options: SelectFieldOption[];
    placeholder?: string;
    required?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'default';
    className?: string;
    contentClassName?: string;
    'aria-label'?: string;
    'aria-invalid'?: boolean;
}) {
    const toRadix = (v: string | number | null | undefined) =>
        v === null || v === undefined || String(v) === '' ? EMPTY : String(v);
    const hasEmpty = options.some((o) => String(o.value) === '');
    const current = toRadix(value);

    return (
        <Select
            value={current === EMPTY && !hasEmpty ? '' : current}
            onValueChange={(v) => onValueChange(v === EMPTY ? '' : v)}
            required={required}
            disabled={disabled}
        >
            <SelectTrigger
                id={id}
                size={size}
                aria-label={ariaLabel}
                aria-invalid={ariaInvalid}
                className={cn('w-full bg-white font-normal', className)}
            >
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent align="start" className={contentClassName}>
                {options.map((option) => (
                    <SelectItem
                        key={toRadix(option.value)}
                        value={toRadix(option.value)}
                        disabled={option.disabled}
                    >
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
