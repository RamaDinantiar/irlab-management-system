import { Link } from '@inertiajs/react';
import { Armchair, ArrowUpRight, MapPin, UserRound } from 'lucide-react';
import { useNow } from '@/hooks/use-now';
import { formatCountdown, formatTimeRange } from '@/lib/datetime';
import type { PraktikanDashboard } from '@/types';

/**
 * PRD FR-PD-2: kelas berikutnya — mata kuliah, materi pertemuan, ruang, jam, asisten,
 * nomor kursi saya, hitung mundur. Gaya kartu gradient Figma.
 */
export function NextClassCard({
    nextClass,
}: {
    nextClass: PraktikanDashboard['nextClass'];
}) {
    const now = useNow();

    if (!nextClass) {
        return (
            <div className="flex min-h-36 flex-col justify-end gap-1 bg-linear-to-r from-primary-900 to-primary p-5 text-white">
                <span className="text-h3 font-bold">Kelas Berikutnya</span>
                <span className="font-mono text-sm">
                    Tidak ada kelas terjadwal dalam 2 minggu ke depan.
                </span>
            </div>
        );
    }

    const running = new Date(nextClass.startsAt).getTime() <= now;

    return (
        <Link
            href="/praktikan/schedule"
            prefetch
            className="group relative flex min-h-36 flex-col gap-1.5 bg-linear-to-r from-primary-900 to-primary p-5 text-white transition-shadow hover:shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
            <span className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full ring-2 ring-white/90 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="size-5" aria-hidden />
            </span>
            <span className="w-fit bg-white px-2 py-0.5 font-mono text-xs font-bold text-primary-900">
                {running
                    ? 'Sedang berlangsung'
                    : `Mulai ${formatCountdown(nextClass.startsAt, now)} lagi`}
            </span>
            <span className="pr-10 text-h3 font-bold text-balance">
                {nextClass.course} · {nextClass.className}
            </span>
            {nextClass.topic && (
                <span className="font-mono text-sm">{nextClass.topic}</span>
            )}
            <span className="font-mono text-sm">
                {formatTimeRange(nextClass.startsAt, nextClass.endsAt)}
            </span>
            <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" aria-hidden />
                    {nextClass.room}
                </span>
                <span className="flex items-center gap-1.5">
                    <Armchair className="size-4" aria-hidden />
                    {nextClass.seat
                        ? `Kursi ${nextClass.seat}`
                        : 'Belum kontrak kursi'}
                </span>
                <span className="flex items-center gap-1.5">
                    <UserRound className="size-4" aria-hidden />
                    {nextClass.assistant}
                </span>
            </span>
        </Link>
    );
}
