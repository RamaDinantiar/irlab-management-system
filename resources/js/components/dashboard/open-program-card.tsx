import { Link } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { useNow } from '@/hooks/use-now';
import { formatCountdown } from '@/lib/datetime';
import type { PraktikanDashboard } from '@/types';

/** PRD FR-PD-7: program yang sedang membuka pendaftaran (posisi kartu ke-3 Figma). */
export function OpenProgramCard({
    program,
}: {
    program: PraktikanDashboard['openProgram'];
}) {
    const now = useNow();

    if (!program) {
        return (
            <section className="flex h-full min-h-36 flex-col justify-end gap-1 border bg-card p-5">
                <h2 className="text-h3 font-bold text-primary-700">
                    Program Terbuka
                </h2>
                <p className="text-sm text-muted-foreground">
                    Belum ada program yang membuka pendaftaran.
                </p>
            </section>
        );
    }

    const percent = Math.min(
        100,
        Math.round((program.registered / program.quota) * 100),
    );

    return (
        <section
            aria-labelledby="open-program-title"
            className="flex h-full min-h-36 flex-col gap-2 border bg-card p-5"
        >
            <p className="font-mono text-xs font-bold text-primary-700 uppercase">
                {program.type} · Pendaftaran dibuka
            </p>
            <h2
                id="open-program-title"
                className="line-clamp-2 text-h3 leading-snug font-bold text-primary-700"
            >
                {program.title}
            </h2>
            <div className="mt-auto flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-40 flex-1 space-y-1">
                    <p className="font-mono text-xs">
                        {program.registered}/{program.quota} kuota · tutup dalam{' '}
                        {formatCountdown(program.closesAt, now)}
                    </p>
                    <div
                        role="progressbar"
                        aria-label="Kuota terisi"
                        aria-valuemin={0}
                        aria-valuemax={program.quota}
                        aria-valuenow={program.registered}
                        className="h-1.5 bg-primary-50"
                    >
                        <div
                            className="h-full bg-primary"
                            style={{ width: `${percent}%` }}
                        />
                    </div>
                </div>
                <Button size="sm" asChild>
                    <Link href={program.href} prefetch>
                        Daftar
                    </Link>
                </Button>
            </div>
        </section>
    );
}
