/** PRD 8.5: semua waktu ditampilkan dalam WIB, apa pun zona waktu perangkat. */
const TIME_ZONE = 'Asia/Jakarta';

const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE });

/** Tanggal hari ini di WIB, format YYYY-MM-DD. */
export function todayWib(): string {
    return ymd.format(new Date());
}

const relative = new Intl.RelativeTimeFormat('id', { numeric: 'auto' });

/** "12 menit yang lalu", "kemarin", "dalam 3 jam". */
export function formatRelative(iso: string, now: number = Date.now()): string {
    const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
    const abs = Math.abs(seconds);

    if (abs < 60) {
        return 'baru saja';
    }

    if (abs < 3600) {
        return relative.format(Math.round(seconds / 60), 'minute');
    }

    if (abs < 86_400) {
        return relative.format(Math.round(seconds / 3600), 'hour');
    }

    return relative.format(Math.round(seconds / 86_400), 'day');
}

/** Hitung mundur ringkas: "2 hari 3 jam", "1 jam 15 menit", "12 menit". */
export function formatCountdown(iso: string, now: number = Date.now()): string {
    const minutes = Math.max(
        0,
        Math.round((new Date(iso).getTime() - now) / 60_000),
    );
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;

    if (days > 0) {
        return hours > 0 ? `${days} hari ${hours} jam` : `${days} hari`;
    }

    if (hours > 0) {
        return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`;
    }

    return `${mins} menit`;
}

/** "Rabu, 7 Okt · 13.00–16.00 WIB". */
export function formatTimeRange(startIso: string, endIso: string): string {
    const day = new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        timeZone: TIME_ZONE,
    }).format(new Date(startIso));
    const time = new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: TIME_ZONE,
    });

    return `${day} · ${time.format(new Date(startIso))}–${time.format(new Date(endIso))} WIB`;
}

/** "5–11 Oktober 2026" dari tanggal Senin "YYYY-MM-DD". */
export function formatWeekRange(monday: string): string {
    const start = new Date(`${monday}T00:00:00+07:00`);
    const end = new Date(start.getTime() + 6 * 86_400_000);
    const fmt = (date: Date, options: Intl.DateTimeFormatOptions) =>
        new Intl.DateTimeFormat('id-ID', {
            ...options,
            timeZone: TIME_ZONE,
        }).format(date);

    return start.getMonth() === end.getMonth()
        ? `${fmt(start, { day: 'numeric' })}–${fmt(end, { day: 'numeric', month: 'long', year: 'numeric' })}`
        : `${fmt(start, { day: 'numeric', month: 'short' })} – ${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** Tanggal (angka) untuk hari ke-n (1–7) dalam minggu yang dimulai `monday`. */
export function dayOfMonth(monday: string, day: number): number {
    const date = new Date(`${monday}T00:00:00+07:00`);

    return Number(
        new Intl.DateTimeFormat('id-ID', {
            day: 'numeric',
            timeZone: TIME_ZONE,
        }).format(new Date(date.getTime() + (day - 1) * 86_400_000)),
    );
}

/** "07:20" → "07.20" (format jam Indonesia, seperti di Figma). */
export function formatClock(time: string): string {
    return time.replace(':', '.');
}

/** ISO dari server (sudah WIB) → "08.30". */
export function formatIsoClock(iso: string): string {
    return formatClock(iso.slice(11, 16));
}

/** "YYYY-MM-DD" → "24 Agu 2026". */
export function formatDate(date: string): string {
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: TIME_ZONE,
    }).format(new Date(`${date}T00:00:00+07:00`));
}

/** "24 Agu 2026 – 18 Des 2026". */
export function formatDateRange(start: string, end: string): string {
    return `${formatDate(start)} – ${formatDate(end)}`;
}
