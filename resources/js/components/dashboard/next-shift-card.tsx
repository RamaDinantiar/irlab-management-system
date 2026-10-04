import { CalendarClock, MapPin } from 'lucide-react';
import { useNow } from '@/hooks/use-now';
import { formatCountdown, formatTimeRange } from '@/lib/datetime';
import type { AsistenDashboard } from '@/types';

/** PRD FR-AD-3: shift berikutnya (ruang, kegiatan, jam, hitung mundur). */
export function NextShiftCard({
    shift,
}: {
    shift: AsistenDashboard['nextShift'];
}) {
    const now = useNow();
    const running =
        shift !== null &&
        new Date(shift.startsAt).getTime() <= now &&
        now < new Date(shift.endsAt).getTime();

    return (
        <section
            aria-labelledby="next-shift-title"
            className="flex min-h-36 flex-col gap-2 border bg-card p-5"
        >
            <h2
                id="next-shift-title"
                className="text-h3 font-bold text-primary-700"
            >
                Shift Berikutnya
            </h2>
            {shift ? (
                <>
                    <p className="font-mono text-sm font-bold">{shift.title}</p>
                    <p className="flex items-center gap-1.5 font-mono text-sm">
                        <CalendarClock
                            className="size-4 shrink-0 text-primary-700"
                            aria-hidden
                        />
                        {formatTimeRange(shift.startsAt, shift.endsAt)}
                    </p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-sm">
                            <MapPin
                                className="size-4 text-primary-700"
                                aria-hidden
                            />
                            {shift.room}
                        </span>
                        <span className="bg-primary-50 px-2 py-0.5 font-mono text-xs font-bold text-primary-700">
                            {running
                                ? 'Sedang berlangsung'
                                : `${formatCountdown(shift.startsAt, now)} lagi`}
                        </span>
                    </div>
                </>
            ) : (
                <p className="text-sm text-muted-foreground">
                    Tidak ada shift ngawas terjadwal dalam 2 minggu ke depan.
                </p>
            )}
        </section>
    );
}
