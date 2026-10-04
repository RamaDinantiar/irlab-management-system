import { Ban, Monitor } from 'lucide-react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { RoomLayout, SeatCell, SeatOccupant } from '@/types';

/**
 * Denah kursi lab (PRD 5.x "Komponen kursi"): papan tulis di depan, blok meja
 * dipisah lorong (kolom tanpa sel). Varian:
 *  - `detail`  — kartu dengan nama & NIM (Figma "Denah Ruang Lab", Seat Mapping)
 *  - `compact` — sel persegi 40–48 px untuk memilih kursi (Figma "Pilih Workstation")
 */
export type SeatMapProps = {
    layout: RoomLayout;
    occupants: SeatOccupant[];
    variant?: 'detail' | 'compact';
    selectedId?: number | null;
    /** Kursi mana yang bisa diklik; default: tidak ada (read-only). */
    isSelectable?: (
        cell: SeatCell,
        occupant: SeatOccupant | undefined,
    ) => boolean;
    onSelect?: (cell: SeatCell, occupant: SeatOccupant | undefined) => void;
};

export function displayLabel(label: string | null) {
    return (label ?? '').replace(/^([A-Za-z]+)-?(\d+)$/, '$1 - $2');
}

/** Pisahkan kolom menjadi blok berdasarkan kolom lorong (tanpa sel sama sekali). */
function segmentsOf(layout: RoomLayout) {
    const used = new Set(layout.cells.map((cell) => cell.col));
    const segments: number[][] = [];
    let current: number[] = [];

    for (let col = 1; col <= layout.cols; col++) {
        if (used.has(col)) {
            current.push(col);
        } else if (current.length) {
            segments.push(current);
            current = [];
        }
    }

    if (current.length) {
        segments.push(current);
    }

    return segments;
}

export function SeatMap({
    layout,
    occupants,
    variant = 'detail',
    selectedId,
    isSelectable,
    onSelect,
}: SeatMapProps) {
    const segments = useMemo(() => segmentsOf(layout), [layout]);
    const byPosition = useMemo(
        () =>
            new Map(
                layout.cells.map((cell) => [`${cell.row}:${cell.col}`, cell]),
            ),
        [layout],
    );
    const bySeat = useMemo(
        () => new Map(occupants.map((o) => [o.seatId, o])),
        [occupants],
    );
    const compact = variant === 'compact';
    const titles =
        segments.length === 2
            ? ['Meja Sisi Kiri', 'Meja Sisi Kanan']
            : segments.map((_, i) => `Blok ${i + 1}`);

    return (
        <div className="overflow-x-auto">
            {/* Lebar minimum tetap (bukan max-content) agar nama panjang membungkus; layar sempit → geser horizontal. */}
            <div
                className={cn(
                    'grid gap-4',
                    compact ? 'w-max min-w-full' : 'min-w-[44rem]',
                )}
            >
                <div
                    className={cn(
                        'grid justify-items-center gap-1 bg-primary-50 px-4 py-3 text-center',
                        compact && 'py-2',
                    )}
                >
                    <span
                        aria-hidden
                        className="h-2 w-1/2 min-w-40 bg-primary-200"
                    />
                    <span className="text-sm font-bold text-primary-800">
                        Papan Tulis
                    </span>
                    <span className="text-[11px] text-primary-700">
                        Depan Ruang Laboratorium (Front)
                    </span>
                </div>

                <div
                    className={cn(
                        'flex gap-4',
                        compact ? 'justify-between gap-6' : 'gap-6',
                    )}
                >
                    {segments.map((cols, index) => (
                        <section
                            key={cols[0]}
                            aria-label={titles[index]}
                            style={{ flex: `${cols.length} 1 0%` }}
                            className={cn(
                                'min-w-0',
                                !compact && 'bg-primary-50/70 p-4',
                            )}
                        >
                            {!compact && segments.length > 1 && (
                                <h3 className="mb-4 text-xs font-bold tracking-wide text-primary-800 uppercase">
                                    {titles[index]}
                                </h3>
                            )}
                            <div
                                className={cn(
                                    'grid',
                                    compact ? 'gap-2' : 'gap-3',
                                )}
                                style={{
                                    gridTemplateColumns: `repeat(${cols.length}, ${compact ? '2.75rem' : 'minmax(5.25rem, 1fr)'})`,
                                    gridTemplateRows: `repeat(${layout.rows}, auto)`,
                                }}
                            >
                                {Array.from({ length: layout.rows }, (_, r) =>
                                    cols.map((col, c) => {
                                        const cell = byPosition.get(
                                            `${r + 1}:${col}`,
                                        );
                                        const style = {
                                            gridRow: r + 1,
                                            gridColumn: c + 1,
                                        };

                                        if (!cell) {
                                            return (
                                                <div
                                                    key={`${r}:${col}`}
                                                    style={style}
                                                    aria-hidden
                                                />
                                            );
                                        }

                                        return (
                                            <SeatTile
                                                key={cell.id}
                                                style={style}
                                                cell={cell}
                                                occupant={bySeat.get(cell.id)}
                                                compact={compact}
                                                selected={
                                                    selectedId === cell.id
                                                }
                                                selectable={
                                                    !!onSelect &&
                                                    (isSelectable?.(
                                                        cell,
                                                        bySeat.get(cell.id),
                                                    ) ??
                                                        false)
                                                }
                                                onSelect={onSelect}
                                            />
                                        );
                                    }),
                                )}
                            </div>
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}

function SeatTile({
    cell,
    occupant,
    compact,
    selected,
    selectable,
    onSelect,
    style,
}: {
    cell: SeatCell;
    occupant: SeatOccupant | undefined;
    compact: boolean;
    selected: boolean;
    selectable: boolean;
    onSelect?: SeatMapProps['onSelect'];
    style: React.CSSProperties;
}) {
    if (cell.type === 'assistant_desk') {
        return (
            <div
                style={style}
                className={cn(
                    'flex flex-col items-center justify-center gap-1 border border-dashed border-primary-500 bg-white text-center text-[11px] font-bold text-primary-700',
                    compact ? 'size-11' : 'min-h-24 p-2',
                )}
                title="Meja Asisten"
            >
                <Monitor className="size-4" aria-hidden />
                {!compact && 'Meja Asisten'}
                <span className="sr-only">Meja Asisten</span>
            </div>
        );
    }

    if (cell.type !== 'seat') {
        return (
            <div
                style={style}
                className={cn(
                    'flex items-center justify-center bg-[repeating-linear-gradient(45deg,var(--color-muted),var(--color-muted)_4px,transparent_4px,transparent_8px)] text-muted-foreground',
                    compact ? 'size-11' : 'min-h-24',
                )}
                title="Nonaktif"
            >
                <Ban className="size-4" aria-hidden />
                <span className="sr-only">Kursi nonaktif</span>
            </div>
        );
    }

    const label = displayLabel(cell.label);
    const description = occupant
        ? `${cell.label}, ${occupant.mine ? 'kursi Anda' : `terisi oleh ${occupant.name} (${occupant.nim})`}`
        : `${cell.label}, kosong`;
    const Element = selectable ? 'button' : 'div';

    if (compact) {
        return (
            <Element
                {...(selectable
                    ? {
                          type: 'button' as const,
                          onClick: () => onSelect?.(cell, occupant),
                          'aria-pressed': selected,
                      }
                    : {})}
                style={style}
                aria-label={description}
                title={
                    occupant
                        ? `${occupant.name} · ${occupant.nim}`
                        : (cell.label ?? undefined)
                }
                className={cn(
                    'flex size-11 flex-col items-center justify-center border font-mono text-[11px] leading-tight font-bold transition-colors',
                    selected
                        ? 'border-primary-900 bg-primary-800 text-white'
                        : occupant?.mine
                          ? 'border-primary-700 bg-primary-100 text-primary-900'
                          : occupant
                            ? 'border-slate-400 bg-slate-300 text-slate-600'
                            : 'border-primary-500 bg-primary-50 text-primary-800',
                    selectable &&
                        'cursor-pointer hover:bg-primary-100 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
                    selectable && selected && 'hover:bg-primary-800',
                )}
            >
                {(cell.label ?? '').split('-').map((part) => (
                    <span key={part}>{part}</span>
                ))}
            </Element>
        );
    }

    return (
        <Element
            {...(selectable
                ? {
                      type: 'button' as const,
                      onClick: () => onSelect?.(cell, occupant),
                      'aria-pressed': selected,
                  }
                : {})}
            style={style}
            aria-label={description}
            className={cn(
                'grid min-h-24 content-start gap-1 border p-2.5 text-left transition-colors',
                selected
                    ? 'border-2 border-primary-700 bg-primary-100'
                    : occupant?.mine
                      ? 'border-2 border-primary-600 bg-primary-100'
                      : 'border-slate-300 bg-white',
                selectable &&
                    'cursor-pointer hover:border-primary-500 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
            )}
        >
            <span className="flex items-center justify-between gap-2">
                <span
                    className={cn(
                        'text-sm font-bold whitespace-nowrap',
                        occupant ? 'text-primary-800' : 'text-muted-foreground',
                    )}
                >
                    {label}
                </span>
                <span
                    aria-hidden
                    className={cn(
                        'size-2.5 shrink-0 rounded-full',
                        occupant ? 'bg-primary-600' : 'bg-slate-400',
                    )}
                />
            </span>
            {occupant ? (
                <>
                    <span className="line-clamp-2 text-[11px] leading-snug font-bold">
                        {occupant.mine ? 'Kursi Anda' : occupant.name}
                    </span>
                    <span className="font-mono text-[11px] text-primary-700">
                        {occupant.nim}
                    </span>
                </>
            ) : (
                <>
                    <span className="text-[11px] text-muted-foreground">
                        Kosong
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                        Belum Terisi
                    </span>
                </>
            )}
        </Element>
    );
}

/** Keterangan warna (selalu disertai teks — PRD 7.2). */
export function SeatLegend({
    items,
}: {
    items: { label: string; className: string }[];
}) {
    return (
        <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            {items.map((item) => (
                <li key={item.label} className="flex items-center gap-2">
                    <span
                        aria-hidden
                        className={cn('size-3', item.className)}
                    />
                    {item.label}
                </li>
            ))}
        </ul>
    );
}
