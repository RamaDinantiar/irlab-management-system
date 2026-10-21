import { Head, router } from '@inertiajs/react';
import { Armchair, Mail, Phone } from 'lucide-react';
import { useState } from 'react';
import SeatController from '@/actions/App/Http/Controllers/Asisten/SeatController';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    SeatInfoPanel,
    SeatMapHeader,
} from '@/components/seats/seat-map-section';
import { SeatMap } from '@/components/seats/seat-map';
import { useInitials } from '@/hooks/use-initials';
import type { SeatClassSummary, SeatMapPayload, SeatOccupant } from '@/types';

type Selected = SeatClassSummary & { contracted: number; members: number };

/** Asisten › Seats — Figma "Seat Mapping" (read-only). */
export default function AsistenSeats({
    classes,
    selected,
    map,
}: {
    classes: { id: number; label: string }[];
    selected: Selected | null;
    map: SeatMapPayload | null;
}) {
    const [focus, setFocus] = useState<SeatOccupant | null>(null);
    const getInitials = useInitials();

    return (
        <>
            <Head title="Seat Mapping" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Seat Mapping"
                    description="Pusat pemetaan kontrak tempat duduk mahasiswa di Laboratorium Information Retrieval."
                />

                {!selected ? (
                    <EmptyState
                        icon={Armchair}
                        title="Belum ada kelas"
                        description="Anda belum mengampu kelas pada semester aktif."
                    />
                ) : (
                    <>
                        <SeatInfoPanel
                            classes={classes}
                            selected={selected}
                            onChange={(id) =>
                                router.get(
                                    SeatController.index.url({
                                        query: { class: id },
                                    }),
                                    {},
                                    { preserveScroll: true },
                                )
                            }
                        />
                        <section
                            aria-labelledby="map-title"
                            className="grid gap-5 border bg-card p-5"
                        >
                            <SeatMapHeader
                                map={map}
                                selected={selected}
                                hint="Klik workstation untuk melihat detail mahasiswa."
                            />
                            {map ? (
                                <>
                                    <SeatMap
                                        layout={map.layout}
                                        occupants={map.occupants}
                                        selectedId={focus?.seatId}
                                        isSelectable={(_, occupant) =>
                                            !!occupant
                                        }
                                        onSelect={(_, occupant) =>
                                            setFocus(occupant ?? null)
                                        }
                                    />
                                    {focus && (
                                        <div
                                            aria-live="polite"
                                            className="flex flex-wrap items-center gap-4 border-l-4 border-primary-700 bg-primary-50 px-4 py-3 text-sm"
                                        >
                                            <Avatar className="size-16 shrink-0 overflow-hidden rounded-full">
                                                <AvatarImage
                                                    src={
                                                        focus.avatar ??
                                                        undefined
                                                    }
                                                    alt={focus.name}
                                                    className="object-cover"
                                                />
                                                <AvatarFallback className="bg-primary-100 text-h3 text-primary-700">
                                                    {getInitials(focus.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="grid min-w-0 flex-1 gap-1">
                                                <p>
                                                    <strong>
                                                        {focus.name}
                                                    </strong>{' '}
                                                    ·{' '}
                                                    <span className="font-mono">
                                                        {focus.nim}
                                                    </span>
                                                    {focus.major &&
                                                        ` · ${focus.major}`}
                                                </p>
                                                <p className="flex min-w-0 items-center gap-2">
                                                    <Mail
                                                        aria-hidden
                                                        className="size-4 shrink-0 text-primary-700"
                                                    />
                                                    <span className="sr-only">
                                                        Email:
                                                    </span>
                                                    {focus.email ? (
                                                        <a
                                                            href={`mailto:${focus.email}`}
                                                            className="truncate underline-offset-4 hover:underline"
                                                        >
                                                            {focus.email}
                                                        </a>
                                                    ) : (
                                                        '—'
                                                    )}
                                                </p>
                                                <p className="flex items-center gap-2">
                                                    <Phone
                                                        aria-hidden
                                                        className="size-4 shrink-0 text-primary-700"
                                                    />
                                                    <span className="sr-only">
                                                        Nomor HP:
                                                    </span>
                                                    {focus.phone ? (
                                                        <a
                                                            href={`tel:${focus.phone}`}
                                                            className="font-mono underline-offset-4 hover:underline"
                                                        >
                                                            {focus.phone}
                                                        </a>
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            Belum diisi
                                                        </span>
                                                    )}
                                                </p>
                                                <span className="block text-xs text-muted-foreground">
                                                    Perubahan kontrak kursi
                                                    dilakukan oleh Admin.
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Kelas ini belum memiliki ruang.
                                </p>
                            )}
                        </section>
                    </>
                )}
            </div>
        </>
    );
}
