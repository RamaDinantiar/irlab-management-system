import { Head, router } from '@inertiajs/react';
import { Armchair } from 'lucide-react';
import { useState } from 'react';
import SeatController from '@/actions/App/Http/Controllers/Asisten/SeatController';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import {
    SeatInfoPanel,
    SeatMapHeader,
} from '@/components/seats/seat-map-section';
import { SeatMap } from '@/components/seats/seat-map';
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
                                        <p
                                            aria-live="polite"
                                            className="border-l-4 border-primary-700 bg-primary-50 px-4 py-3 text-sm"
                                        >
                                            <strong>{focus.name}</strong> ·{' '}
                                            <span className="font-mono">
                                                {focus.nim}
                                            </span>
                                            {focus.major && ` · ${focus.major}`}
                                            <span className="block text-xs text-muted-foreground">
                                                Perubahan kontrak kursi
                                                dilakukan oleh Admin.
                                            </span>
                                        </p>
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
