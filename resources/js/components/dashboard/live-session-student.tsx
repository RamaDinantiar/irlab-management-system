import { Link } from '@inertiajs/react';
import { Armchair, CheckCircle2, MapPin, PenLine, Timer } from 'lucide-react';
import { LiveBadge } from '@/components/dashboard/live-session-assistant';
import { Button } from '@/components/ui/button';
import { useNow } from '@/hooks/use-now';
import { formatCountdown, formatIsoClock as clock } from '@/lib/datetime';
import { TASK_TYPE_LABEL } from '@/lib/task';
import type { PraktikanLiveSession } from '@/types';

/**
 * Kartu "Kelas Sedang Berlangsung" (Praktikan): Pre/Post-Test yang dibuka
 * asisten langsung bisa dikerjakan dari dashboard.
 */
export function LiveSessionStudent({
    session,
}: {
    session: PraktikanLiveSession;
}) {
    const now = useNow(30_000);

    return (
        <section
            aria-label={`Kelas sedang berlangsung ${session.course} ${session.className}`}
            className="grid gap-4 border-l-4 border-success bg-card p-5 shadow-sm"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                    <LiveBadge />
                    <h2 className="text-h3 font-bold text-primary-900">
                        {session.course} · {session.className}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Pertemuan {session.number}
                        {session.topic && ` · ${session.topic}`} ·{' '}
                        {clock(session.startsAt)}–{clock(session.endsAt)} WIB
                    </p>
                    <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {session.room && (
                            <span className="flex items-center gap-1">
                                <MapPin className="size-4" aria-hidden />{' '}
                                {session.room}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Armchair className="size-4" aria-hidden />{' '}
                            {session.seat
                                ? `Kursi ${session.seat}`
                                : 'Belum kontrak kursi'}
                        </span>
                    </p>
                </div>
                <p className="flex items-center gap-1.5 font-mono text-sm text-primary-700">
                    <Timer className="size-4" aria-hidden /> Selesai dalam{' '}
                    {formatCountdown(session.endsAt, now)}
                </p>
            </div>

            {session.tests.length === 0 ? (
                <p className="border-t pt-3 text-sm text-muted-foreground">
                    Belum ada Pre/Post-Test yang dibuka. Tunggu instruksi
                    asisten — test akan muncul di sini otomatis.
                </p>
            ) : (
                <ul className="divide-y border-t">
                    {session.tests.map((test) => (
                        <li
                            key={test.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-3"
                        >
                            <div className="grid gap-0.5">
                                <span className="font-mono text-xs font-bold text-primary-700">
                                    {TASK_TYPE_LABEL[test.type]}
                                </span>
                                <span className="font-medium">
                                    {test.title}
                                </span>
                                {test.dueAt && !test.submitted && (
                                    <span className="text-xs text-muted-foreground">
                                        Ditutup dalam{' '}
                                        {formatCountdown(test.dueAt, now)}
                                    </span>
                                )}
                            </div>
                            {test.submitted ? (
                                <span className="flex items-center gap-1.5 text-sm font-medium text-success">
                                    <CheckCircle2
                                        className="size-4"
                                        aria-hidden
                                    />{' '}
                                    Sudah dikumpulkan
                                </span>
                            ) : (
                                <Button asChild>
                                    <Link href={test.href}>
                                        <PenLine /> Kerjakan Sekarang
                                    </Link>
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
