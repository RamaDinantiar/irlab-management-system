import type { ReactNode } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * Kartu pilihan berlabel (Figma "Seat Mapping"/"Grade"): seluruh kartu adalah
 * tombol, label kecil di atas nilai, chevron di ujung kanan, dan daftar
 * pilihan selebar kartu.
 */
export function LabeledSelect({
    id,
    label,
    value,
    onValueChange,
    options,
    placeholder,
    disabled,
    className,
}: {
    id: string;
    label: string;
    value: string | number | null | undefined;
    onValueChange: (value: string) => void;
    options: { value: string | number; label: ReactNode }[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <Select
            value={value === null || value === undefined ? '' : String(value)}
            onValueChange={onValueChange}
            disabled={disabled}
        >
            <SelectTrigger
                id={id}
                className={cn(
                    'w-full gap-3 rounded-none border-input bg-card px-4 py-2.5 text-left shadow-sm data-[size=default]:h-auto [&>svg:last-child]:size-5',
                    className,
                )}
            >
                <span className="grid min-w-0 gap-1">
                    <span className="text-sm text-muted-foreground">
                        {label}
                    </span>
                    <span className="truncate text-base font-bold">
                        <SelectValue placeholder={placeholder} />
                    </span>
                </span>
            </SelectTrigger>
            <SelectContent
                align="start"
                className="w-(--radix-select-trigger-width) rounded-none"
            >
                {options.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
