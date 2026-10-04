/** Nama hari ISO-8601 (1 = Senin … 7 = Minggu) — sama dengan App\Support\ClassDays. */
export const DAY_NAMES = [
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
    "Jum'at",
    'Sabtu',
    'Minggu',
];

export function dayName(day: number): string {
    return DAY_NAMES[day - 1] ?? '';
}

/** "Senin, 07.20–09.50". */
export function formatSchedule(
    day: number,
    start: string,
    end: string,
): string {
    return `${dayName(day)}, ${start.replace(':', '.')}–${end.replace(':', '.')}`;
}
