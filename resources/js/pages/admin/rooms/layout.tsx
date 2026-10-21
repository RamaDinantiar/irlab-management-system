import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Armchair,
    Ban,
    Eraser,
    ListOrdered,
    Lock,
    Monitor,
    MousePointer2,
    RotateCcw,
    Save,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import RoomController from '@/actions/App/Http/Controllers/Admin/RoomController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { RoomLayout, SeatCellType } from '@/types';

type Cell = {
    type: Exclude<SeatCellType, 'aisle'>;
    label: string | null;
    id?: number;
};
type Tool = 'select' | 'seat' | 'assistant_desk' | 'disabled' | 'erase';

const TOOLS: { value: Tool; label: string; icon: typeof Armchair }[] = [
    { value: 'select', label: 'Pilih / ubah label', icon: MousePointer2 },
    { value: 'seat', label: 'Kursi', icon: Armchair },
    { value: 'assistant_desk', label: 'Meja Asisten', icon: Monitor },
    { value: 'disabled', label: 'Nonaktif', icon: Ban },
    { value: 'erase', label: 'Lorong (hapus)', icon: Eraser },
];

const key = (row: number, col: number) => `${row}:${col}`;
const pad = (n: number) => `PC-${String(n).padStart(2, '0')}`;

/** Sama dengan RoomLayout::numbered(): berkelok dari depan kanan. */
function renumber(cells: Map<string, Cell>): Map<string, Cell> {
    const seats = [...cells.entries()]
        .filter(([, cell]) => cell.type === 'seat')
        .map(([k]) => k.split(':').map(Number) as [number, number])
        .sort(
            ([r1, c1], [r2, c2]) =>
                r1 - r2 || (r1 % 2 === 1 ? c2 - c1 : c1 - c2),
        );
    const next = new Map(cells);
    seats.forEach(([r, c], i) =>
        next.set(key(r, c), { ...next.get(key(r, c))!, label: pad(i + 1) }),
    );

    return next;
}

function defaults(rows: number, cols: number): Map<string, Cell> {
    const aisle = cols >= 5 ? Math.floor(cols / 2) + 1 : null;
    const cells = new Map<string, Cell>();

    for (let r = 1; r <= rows; r++) {
        for (let c = 1; c <= cols; c++) {
            if (c === aisle) continue;
            if (c === 1 && r <= 2 && rows >= 4) {
                if (r === 1)
                    cells.set(key(r, c), {
                        type: 'assistant_desk',
                        label: null,
                    });
                continue;
            }
            cells.set(key(r, c), { type: 'seat', label: null });
        }
    }

    return renumber(cells);
}

/** Admin › Ruang & Denah › Editor (FR-ADM-05). */
export default function RoomLayoutEditor({
    room,
    contractedSeatIds,
}: {
    room: RoomLayout;
    contractedSeatIds: number[];
}) {
    const initial = useMemo(
        () =>
            new Map<string, Cell>(
                room.cells
                    .filter((c) => c.type !== 'aisle')
                    .map((c) => [
                        key(c.row, c.col),
                        {
                            type: c.type as Cell['type'],
                            label: c.label,
                            id: c.id,
                        },
                    ]),
            ),
        [room],
    );
    const [cells, setCells] = useState(initial);
    const [tool, setTool] = useState<Tool>('seat');
    const [active, setActive] = useState<string | null>(null);
    const [painting, setPainting] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const locked = useMemo(
        () => new Set(contractedSeatIds),
        [contractedSeatIds],
    );

    const seatCount = [...cells.values()].filter(
        (c) => c.type === 'seat',
    ).length;
    const duplicate = useMemo(() => {
        const seen = new Map<string, number>();
        cells.forEach(
            (c) =>
                c.label &&
                seen.set(
                    c.label.toUpperCase(),
                    (seen.get(c.label.toUpperCase()) ?? 0) + 1,
                ),
        );

        return new Set(
            [...seen].filter(([, n]) => n > 1).map(([label]) => label),
        );
    }, [cells]);

    const nextLabel = (current: Map<string, Cell>) => {
        const used = new Set([...current.values()].map((c) => c.label));
        let n = 1;
        while (used.has(pad(n))) n++;

        return pad(n);
    };

    const apply = (row: number, col: number) => {
        const k = key(row, col);
        const existing = cells.get(k);

        if (tool === 'select') {
            setActive(existing?.type === 'seat' ? k : null);

            return;
        }

        if (existing?.id && locked.has(existing.id) && tool !== 'seat') {
            setErrors([
                `${existing.label} masih dikontrak praktikan dan tidak dapat diubah.`,
            ]);

            return;
        }

        setCells((current) => {
            const next = new Map(current);
            if (tool === 'erase') {
                next.delete(k);
            } else if (tool === 'seat') {
                if (existing?.type !== 'seat')
                    next.set(k, {
                        ...existing,
                        type: 'seat',
                        label: nextLabel(current),
                    });
            } else {
                next.set(k, { ...existing, type: tool, label: null });
            }

            return next;
        });
    };

    const save = () => {
        setSaving(true);
        router.put(
            RoomController.saveLayout.url(room.id),
            {
                cells: [...cells.entries()].map(([k, c]) => {
                    const [row, col] = k.split(':').map(Number);

                    return { row, col, type: c.type, label: c.label };
                }),
            },
            {
                preserveScroll: true,
                onSuccess: () => setErrors([]),
                onError: (bag) => setErrors(Object.values(bag)),
                onFinish: () => setSaving(false),
            },
        );
    };

    const activeCell = active ? cells.get(active) : null;

    return (
        <>
            <Head title={`Denah ${room.name}`} />
            <div
                className="flex flex-col gap-6 p-4 md:p-6 lg:p-8"
                onPointerUp={() => setPainting(false)}
            >
                <div className="flex flex-wrap items-end justify-between gap-4 border-b border-primary-200 pb-5">
                    <div className="space-y-1">
                        <Link
                            href={RoomController.index.url()}
                            className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline"
                        >
                            <ArrowLeft className="size-4" aria-hidden /> Ruang &
                            Denah
                        </Link>
                        <h1 className="text-h1 font-bold text-primary-900">
                            Denah {room.name}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Grid {room.rows} × {room.cols} ·{' '}
                            <strong>{seatCount}</strong> kursi. Kolom tanpa sel
                            menjadi lorong pemisah blok meja.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() =>
                                setCells(defaults(room.rows, room.cols))
                            }
                            disabled={locked.size > 0}
                            title={
                                locked.size > 0
                                    ? 'Tidak tersedia: ada kursi terkontrak'
                                    : undefined
                            }
                        >
                            <RotateCcw /> Denah Bawaan
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setCells((c) => renumber(c))}
                        >
                            <ListOrdered /> Nomori Ulang
                        </Button>
                        <Button
                            onClick={save}
                            disabled={saving || duplicate.size > 0}
                        >
                            {saving ? <Spinner /> : <Save />} Simpan Denah
                        </Button>
                    </div>
                </div>

                {errors.length > 0 && (
                    <div
                        role="alert"
                        className="border border-destructive/40 bg-danger-soft p-3 text-sm text-destructive"
                    >
                        {errors.map((e) => (
                            <p key={e}>{e}</p>
                        ))}
                    </div>
                )}

                <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
                    <aside className="grid content-start gap-4">
                        <div
                            role="radiogroup"
                            aria-label="Alat"
                            className="grid gap-1 border bg-card p-2"
                        >
                            {TOOLS.map(({ value, label, icon: Icon }) => (
                                <button
                                    key={value}
                                    type="button"
                                    role="radio"
                                    aria-checked={tool === value}
                                    onClick={() => setTool(value)}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2 text-left text-sm',
                                        tool === value
                                            ? 'bg-primary-700 font-medium text-white'
                                            : 'hover:bg-primary-50',
                                    )}
                                >
                                    <Icon className="size-4" aria-hidden />{' '}
                                    {label}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Klik atau seret di grid untuk menggambar. Kursi
                            bergembok sedang dikontrak dan hanya bisa diubah
                            labelnya.
                        </p>
                        {activeCell && active && (
                            <div className="grid gap-2 border bg-card p-3">
                                <Label htmlFor="seat-label">
                                    Label kursi (
                                    {active.replace(':', ', kolom ')})
                                </Label>
                                <Input
                                    id="seat-label"
                                    value={activeCell.label ?? ''}
                                    maxLength={20}
                                    onChange={(event) =>
                                        setCells((current) =>
                                            new Map(current).set(active, {
                                                ...activeCell,
                                                label: event.target.value.toUpperCase(),
                                            }),
                                        )
                                    }
                                    className="font-mono"
                                />
                                {activeCell.label &&
                                    duplicate.has(
                                        activeCell.label.toUpperCase(),
                                    ) && (
                                        <InputError message="Label sudah dipakai kursi lain." />
                                    )}
                            </div>
                        )}
                    </aside>

                    <section
                        aria-label="Grid denah"
                        className="grid min-w-0 gap-3 border bg-card p-4"
                    >
                        <div className="grid justify-items-center gap-1 bg-primary-50 py-2 text-center text-sm font-bold text-primary-800">
                            <span
                                aria-hidden
                                className="h-1.5 w-1/2 bg-primary-200"
                            />{' '}
                            Papan Tulis (Depan)
                        </div>
                        {/* Papan tulis di luar area geser agar selalu terlihat utuh. */}
                        <div className="overflow-x-auto">
                            <div
                                className="grid w-max gap-1.5 select-none"
                                style={{
                                    gridTemplateColumns: `repeat(${room.cols}, 3.5rem)`,
                                }}
                            >
                                {Array.from({ length: room.rows }, (_, r) =>
                                    Array.from(
                                        { length: room.cols },
                                        (_, c) => {
                                            const k = key(r + 1, c + 1);
                                            const cell = cells.get(k);
                                            const isLocked =
                                                !!cell?.id &&
                                                locked.has(cell.id);

                                            return (
                                                <button
                                                    key={k}
                                                    type="button"
                                                    aria-label={`Baris ${r + 1} kolom ${c + 1}: ${cell ? (cell.type === 'seat' ? cell.label : cell.type === 'assistant_desk' ? 'meja asisten' : 'nonaktif') : 'lorong'}`}
                                                    onPointerDown={() => {
                                                        setPainting(
                                                            tool !== 'select',
                                                        );
                                                        apply(r + 1, c + 1);
                                                    }}
                                                    onPointerEnter={() =>
                                                        painting &&
                                                        apply(r + 1, c + 1)
                                                    }
                                                    className={cn(
                                                        'relative flex size-14 flex-col items-center justify-center border text-[11px] leading-tight font-bold focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                                                        !cell &&
                                                            'border-dashed border-slate-200 bg-white text-slate-300',
                                                        cell?.type === 'seat' &&
                                                            'border-primary-500 bg-primary-50 font-mono text-primary-800',
                                                        cell?.type === 'seat' &&
                                                            cell.label &&
                                                            duplicate.has(
                                                                cell.label.toUpperCase(),
                                                            ) &&
                                                            'border-destructive bg-danger-soft text-destructive',
                                                        cell?.type ===
                                                            'assistant_desk' &&
                                                            'border-dashed border-primary-600 bg-white text-primary-700',
                                                        cell?.type ===
                                                            'disabled' &&
                                                            'border-slate-300 bg-slate-200 text-slate-500',
                                                        active === k &&
                                                            'ring-2 ring-primary-800',
                                                    )}
                                                >
                                                    {cell?.type === 'seat' &&
                                                        (cell.label ?? '?')}
                                                    {cell?.type ===
                                                        'assistant_desk' && (
                                                        <Monitor
                                                            className="size-4"
                                                            aria-hidden
                                                        />
                                                    )}
                                                    {cell?.type ===
                                                        'disabled' && (
                                                        <Ban
                                                            className="size-4"
                                                            aria-hidden
                                                        />
                                                    )}
                                                    {isLocked && (
                                                        <Lock
                                                            className="absolute top-0.5 right-0.5 size-3"
                                                            aria-hidden
                                                        />
                                                    )}
                                                </button>
                                            );
                                        },
                                    ),
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
