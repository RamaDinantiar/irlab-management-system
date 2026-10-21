import { Head, router, useForm } from '@inertiajs/react';
import { Armchair, ArrowRightLeft, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import SeatContractController from '@/actions/App/Http/Controllers/Admin/SeatContractController';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import {
    SeatInfoPanel,
    SeatMapHeader,
} from '@/components/seats/seat-map-section';
import { displayLabel, SeatMap } from '@/components/seats/seat-map';
import { SelectField } from '@/components/select-field';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
    SeatCell,
    SeatClassSummary,
    SeatMapPayload,
    SeatOccupant,
} from '@/types';

type Selected = SeatClassSummary & { contracted: number; members: number };
type ClassOption = {
    id: number;
    label: string;
    contracted: number;
    members: number;
};

function CorrectionDialog({
    target,
    map,
    onClose,
}: {
    target: { cell: SeatCell; occupant: SeatOccupant } | null;
    map: SeatMapPayload;
    onClose: () => void;
}) {
    const [mode, setMode] = useState<'move' | 'cancel'>('move');
    const form = useForm({ seat_id: '', reason: '' });
    const taken = new Set(map.occupants.map((o) => o.seatId));
    const empty = map.layout.cells.filter(
        (cell) => cell.type === 'seat' && !taken.has(cell.id),
    );

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!target?.occupant.contractId) return;

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        };
        if (mode === 'move') {
            form.put(
                SeatContractController.update.url(target.occupant.contractId),
                options,
            );
        } else {
            form.delete(
                SeatContractController.destroy.url(target.occupant.contractId),
                options,
            );
        }
    };

    return (
        <Dialog
            open={target !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        Koreksi Kontrak {displayLabel(target?.cell.label ?? '')}
                    </DialogTitle>
                    <DialogDescription>
                        {target?.occupant.name} ·{' '}
                        <span className="font-mono">
                            {target?.occupant.nim}
                        </span>
                        {target?.occupant.major &&
                            ` · ${target.occupant.major}`}
                        . Perubahan tercatat di audit log dan praktikan menerima
                        notifikasi.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="grid gap-5">
                    <div
                        role="radiogroup"
                        aria-label="Jenis koreksi"
                        className="grid grid-cols-2 border"
                    >
                        {(['move', 'cancel'] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={mode === value}
                                onClick={() => setMode(value)}
                                className={cn(
                                    'flex items-center justify-center gap-2 py-2.5 text-sm font-medium',
                                    mode === value
                                        ? value === 'move'
                                            ? 'bg-primary-700 text-white'
                                            : 'bg-destructive text-white'
                                        : 'hover:bg-muted',
                                )}
                            >
                                {value === 'move' ? (
                                    <ArrowRightLeft
                                        className="size-4"
                                        aria-hidden
                                    />
                                ) : (
                                    <Trash2 className="size-4" aria-hidden />
                                )}
                                {value === 'move'
                                    ? 'Pindahkan'
                                    : 'Batalkan Kontrak'}
                            </button>
                        ))}
                    </div>
                    {mode === 'move' && (
                        <div className="grid gap-2">
                            <Label htmlFor="move-seat">
                                Kursi tujuan (kosong)
                            </Label>
                            <SelectField
                                id="move-seat"
                                required
                                value={form.data.seat_id}
                                onValueChange={(v) =>
                                    form.setData('seat_id', v)
                                }
                                placeholder="Pilih kursi…"
                                options={empty.map((cell) => ({
                                    value: cell.id,
                                    label: cell.label,
                                }))}
                                aria-invalid={!!form.errors.seat_id}
                            />
                            <InputError message={form.errors.seat_id} />
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label htmlFor="move-reason">Alasan (wajib)</Label>
                        <Textarea
                            id="move-reason"
                            value={form.data.reason}
                            onChange={(event) =>
                                form.setData('reason', event.target.value)
                            }
                            required
                            minLength={5}
                            maxLength={500}
                            placeholder="Mis. PC-12 rusak, dipindah sementara."
                        />
                        <InputError message={form.errors.reason} />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant={
                                mode === 'cancel' ? 'destructive' : 'default'
                            }
                            disabled={form.processing}
                        >
                            {form.processing && <Spinner />}{' '}
                            {mode === 'move'
                                ? 'Pindahkan Kontrak'
                                : 'Batalkan Kontrak'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/** Admin › Kontrak Kursi (FR-ADM-06, US-D03). */
export default function AdminSeatContracts({
    classes,
    selected,
    map,
}: {
    classes: ClassOption[];
    selected: Selected | null;
    map: SeatMapPayload | null;
}) {
    const [target, setTarget] = useState<{
        cell: SeatCell;
        occupant: SeatOccupant;
    } | null>(null);

    return (
        <>
            <Head title="Kontrak Kursi" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Kontrak Kursi"
                    description="Lihat dan koreksi kontrak tempat duduk seluruh kelas. Klik kursi terisi untuk memindahkan atau membatalkan kontrak."
                />

                {!selected ? (
                    <EmptyState
                        icon={Armchair}
                        title="Belum ada kelas"
                        description="Belum ada kelas yang disetujui pada semester aktif."
                    />
                ) : (
                    <>
                        <SeatInfoPanel
                            classes={classes.map((c) => ({
                                id: c.id,
                                label: `${c.label} · ${c.contracted}/${c.members}`,
                            }))}
                            selected={selected}
                            onChange={(id) =>
                                router.get(
                                    SeatContractController.index.url({
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
                                hint="Klik kursi terisi untuk koreksi kontrak."
                            />
                            {map ? (
                                <SeatMap
                                    layout={map.layout}
                                    occupants={map.occupants}
                                    selectedId={target?.cell.id}
                                    isSelectable={(_, occupant) => !!occupant}
                                    onSelect={(cell, occupant) =>
                                        occupant &&
                                        setTarget({ cell, occupant })
                                    }
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Kelas ini belum memiliki ruang.
                                </p>
                            )}
                        </section>
                        {map && (
                            <CorrectionDialog
                                key={target?.cell.id ?? 0}
                                target={target}
                                map={map}
                                onClose={() => setTarget(null)}
                            />
                        )}
                    </>
                )}
            </div>
        </>
    );
}
