import { LabeledSelect } from '@/components/labeled-select';
import { SeatLegend } from '@/components/seats/seat-map';
import { formatSchedule } from '@/lib/days';
import type { SeatClassSummary, SeatMapPayload } from '@/types';

type Selected = SeatClassSummary & { contracted: number; members: number };

/** Bar atas Figma "Seat Mapping": pilih kelas, jadwal, asisten jaga. */
export function SeatInfoPanel({
    classes,
    selected,
    onChange,
}: {
    classes: { id: number; label: string }[];
    selected: Selected;
    onChange: (id: number) => void;
}) {
    return (
        <div className="grid gap-4 border bg-card p-3 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-center">
            <LabeledSelect
                id="seat-class"
                label="Matakuliah & Kelas"
                value={selected.id}
                onValueChange={(value) => onChange(Number(value))}
                options={classes.map((c) => ({ value: c.id, label: c.label }))}
            />
            <div className="grid gap-1 border border-input px-4 py-2.5 shadow-sm">
                <span className="text-sm text-muted-foreground">Jadwal</span>
                <span className="text-base font-bold">
                    {formatSchedule(
                        selected.dayOfWeek,
                        selected.startTime,
                        selected.endTime,
                    )}{' '}
                    WIB
                </span>
            </div>
            <div className="grid gap-0.5 text-sm md:border-l md:pl-6">
                <span className="text-xs text-muted-foreground">
                    Terkontrak{' '}
                    <strong className="font-mono text-foreground">
                        {selected.contracted}/{selected.members}
                    </strong>{' '}
                    praktikan
                </span>
                <span className="font-medium">
                    Asisten: {selected.assistants.join(', ') || '—'}
                </span>
            </div>
        </div>
    );
}

export function SeatMapHeader({
    map,
    selected,
    hint,
}: {
    map: SeatMapPayload | null;
    selected: Selected;
    hint: string;
}) {
    return (
        <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
                <h2 id="map-title" className="text-h3 font-bold">
                    Denah Ruang {map?.layout.name ?? selected.room ?? ''}
                </h2>
                <p className="text-sm text-muted-foreground">{hint}</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
                <span className="font-medium">Keterangan:</span>
                <SeatLegend
                    items={[
                        {
                            label: 'Terisi',
                            className: 'rounded-full bg-primary-600',
                        },
                        {
                            label: 'Kosong',
                            className: 'rounded-full bg-slate-400',
                        },
                    ]}
                />
            </div>
        </div>
    );
}
