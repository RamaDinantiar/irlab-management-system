import { Head, Link, usePage } from '@inertiajs/react';
import {
    Armchair,
    Building2,
    CalendarDays,
    Info,
    Plus,
    ShieldCheck,
} from 'lucide-react';
import SeatController from '@/actions/App/Http/Controllers/Praktikan/SeatController';
import { EmptyState } from '@/components/empty-state';
import { SeatLegend, SeatMap } from '@/components/seats/seat-map';
import { Button } from '@/components/ui/button';
import { formatSchedule } from '@/lib/days';
import { cn } from '@/lib/utils';
import type { SeatClassSummary, SeatMapPayload } from '@/types';

type ClassCard = SeatClassSummary & { seat: string | null };

/** Praktikan › Seats (FR-PST, US-P04) — Figma "Kontrak Tempat Duduk". */
export default function PraktikanSeats({
    classes,
    selectedId,
    map,
}: {
    classes: ClassCard[];
    selectedId: number | null;
    map: SeatMapPayload | null;
}) {
    const { activeSemester } = usePage().props;
    const contracted = classes.filter((c) => c.seat);
    const pending = classes.filter((c) => !c.seat);
    const nextOpen = pending.find((c) => c.contractOpen);
    const selected = classes.find((c) => c.id === selectedId);

    if (classes.length === 0 || contracted.length === 0) {
        return (
            <>
                <Head title="Kontrak Tempat Duduk" />
                <div className="flex flex-1 items-center justify-center p-4 md:p-8">
                    <div className="w-full max-w-xl">
                        <EmptyState
                            icon={Armchair}
                            title="Kontrak Tempat Duduk"
                            description={
                                classes.length === 0
                                    ? 'Kamu belum tergabung di kelas praktikum. Gabung kelas dengan token dari asisten, lalu pilih kursi.'
                                    : nextOpen
                                      ? 'Kamu belum membuat kontrak tempat duduk.'
                                      : 'Kamu belum membuat kontrak tempat duduk. Periode kontrak kursi belum dibuka oleh asisten.'
                            }
                            action={
                                classes.length === 0 ? (
                                    <Button asChild>
                                        <Link href="/praktikan/class">
                                            Gabung Kelas
                                        </Link>
                                    </Button>
                                ) : (
                                    nextOpen && (
                                        <Button asChild>
                                            <Link
                                                href={SeatController.create.url(
                                                    nextOpen.id,
                                                )}
                                            >
                                                Buat Kontrak
                                            </Link>
                                        </Button>
                                    )
                                )
                            }
                        />
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Kontrak Tempat Duduk" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2">
                        {activeSemester && (
                            <span className="inline-flex items-center gap-2 bg-primary-100 px-2.5 py-1 font-mono text-xs text-primary-800">
                                <span
                                    aria-hidden
                                    className="size-1.5 rounded-full bg-primary-600"
                                />{' '}
                                Semester {activeSemester.name}
                            </span>
                        )}
                        <h1 className="text-h1 font-bold text-primary-900">
                            Kontrak Tempat Duduk
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Pusat Kontrak Tempat Duduk mu selama 1 Semester.
                        </p>
                    </div>
                    <p className="inline-flex items-center gap-2 self-start bg-primary-100 px-3 py-1.5 text-xs font-medium text-primary-800 sm:self-auto">
                        <Info className="size-3.5" aria-hidden /> Semua
                        penempatan terkunci selama 1 Semester
                    </p>
                </div>

                <ul
                    className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                    aria-label="Kontrak kursi per kelas"
                >
                    {contracted.map((c) => {
                        const active = c.id === selectedId;

                        return (
                            <li key={c.id}>
                                <Link
                                    href={SeatController.index.url({
                                        query: { class: c.id },
                                    })}
                                    preserveScroll
                                    aria-current={active ? 'true' : undefined}
                                    className={cn(
                                        'grid gap-3 border bg-card p-4 transition-colors hover:bg-primary-50/50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                                        active
                                            ? 'border-2 border-primary-800 shadow-sm'
                                            : 'border-slate-300',
                                    )}
                                >
                                    <span className="flex items-start justify-between gap-3">
                                        <span className="grid gap-0.5">
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {c.code} • {c.credits} SKS
                                            </span>
                                            <span className="text-h3 font-bold text-primary-900">
                                                {c.course}
                                            </span>
                                            <span className="text-sm">
                                                {c.className}
                                            </span>
                                        </span>
                                        <span
                                            className={cn(
                                                'grid shrink-0 px-2.5 py-1.5 text-center',
                                                active
                                                    ? 'bg-primary-800 text-white'
                                                    : 'bg-primary-100 text-primary-800',
                                            )}
                                        >
                                            <span className="text-[11px]">
                                                Meja
                                            </span>
                                            <span className="font-mono text-sm font-bold">
                                                {c.seat}
                                            </span>
                                        </span>
                                    </span>
                                    <span className="grid gap-2 border-t pt-3 text-xs">
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-2 text-muted-foreground">
                                                <CalendarDays
                                                    className="size-3.5"
                                                    aria-hidden
                                                />{' '}
                                                Jadwal:
                                            </span>
                                            <span className="font-medium">
                                                {formatSchedule(
                                                    c.dayOfWeek,
                                                    c.startTime,
                                                    c.endTime,
                                                )}{' '}
                                                WIB
                                            </span>
                                        </span>
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-2 text-muted-foreground">
                                                <Building2
                                                    className="size-3.5"
                                                    aria-hidden
                                                />{' '}
                                                Lokasi:
                                            </span>
                                            <span className="font-medium">
                                                {c.room ?? '—'}
                                            </span>
                                        </span>
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="flex items-center gap-2 text-muted-foreground">
                                                <ShieldCheck
                                                    className="size-3.5"
                                                    aria-hidden
                                                />{' '}
                                                Status Kontrak:
                                            </span>
                                            <span className="font-medium text-success">
                                                Terkonfirmasi Tetap
                                            </span>
                                        </span>
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                    {pending.length > 0 && (
                        <li>
                            {nextOpen ? (
                                <Link
                                    href={SeatController.create.url(
                                        nextOpen.id,
                                    )}
                                    className="flex h-full min-h-44 flex-col items-center justify-center gap-3 border-2 border-dashed border-primary-500 bg-primary-100/60 p-4 text-center text-sm font-medium text-primary-900 hover:bg-primary-100 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
                                >
                                    Tambah Kontrak
                                    <br />
                                    Tempat Duduk
                                    <span className="flex size-8 items-center justify-center rounded-full bg-primary-800 text-white">
                                        <Plus className="size-4" aria-hidden />
                                    </span>
                                    <span className="text-xs font-normal text-primary-700">
                                        {pending.length} kelas belum memiliki
                                        kursi
                                    </span>
                                </Link>
                            ) : (
                                <div className="flex h-full min-h-44 flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 p-4 text-center text-sm text-muted-foreground">
                                    <Armchair className="size-6" aria-hidden />
                                    {pending.length} kelas belum memiliki kursi.
                                    <span className="text-xs">
                                        Periode kontrak belum dibuka asisten.
                                    </span>
                                </div>
                            )}
                        </li>
                    )}
                </ul>

                {map && selected && (
                    <section
                        aria-labelledby="map-title"
                        className="grid gap-5 border bg-card p-5"
                    >
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div>
                                <h2
                                    id="map-title"
                                    className="text-h3 font-bold"
                                >
                                    Denah Ruang {map.layout.name}
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {selected.course} · {selected.className} —
                                    kursi Anda{' '}
                                    <strong className="font-mono text-primary-800">
                                        {selected.seat}
                                    </strong>
                                </p>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                                <span className="font-medium">Keterangan:</span>
                                <SeatLegend
                                    items={[
                                        {
                                            label: 'Kursi Anda',
                                            className:
                                                'border-2 border-primary-600 bg-primary-100',
                                        },
                                        {
                                            label: 'Terisi',
                                            className:
                                                'rounded-full bg-primary-600',
                                        },
                                        {
                                            label: 'Kosong',
                                            className:
                                                'rounded-full bg-slate-400',
                                        },
                                    ]}
                                />
                            </div>
                        </div>
                        <SeatMap
                            layout={map.layout}
                            occupants={map.occupants}
                        />
                    </section>
                )}
            </div>
        </>
    );
}
