import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowLeftRight,
    CalendarCog,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    Plus,
    Repeat,
    Trash2,
    X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import ScheduleController from '@/actions/App/Http/Controllers/Asisten/ScheduleController';
import ShiftController from '@/actions/App/Http/Controllers/Asisten/ShiftController';
import ShiftSwapController from '@/actions/App/Http/Controllers/Asisten/ShiftSwapController';
import { WeekSchedule } from '@/components/dashboard/week-schedule';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatDate, formatRelative } from '@/lib/datetime';
import { dayName } from '@/lib/days';
import { scheduleColors } from '@/lib/schedule-colors';
import { cn } from '@/lib/utils';
import type {
    AllClassRow,
    MyShift,
    ScheduleEvent,
    ShiftSwapRow,
    SwapStatus,
} from '@/types';

type Props = {
    week: { start: string; today: number; events: ScheduleEvent[] };
    myClassCount: number;
    allClasses: AllClassRow[];
    dutyThisWeek: {
        id: number;
        user: string;
        title: string;
        date: string;
        start: string;
        end: string;
        room: string | null;
    }[];
    myShifts: MyShift[];
    incoming: ShiftSwapRow[];
    history: ShiftSwapRow[];
    manage: {
        assistants: { id: number; name: string }[];
        rooms: { id: number; name: string }[];
        shiftCount: number;
    } | null;
};

const SWAP_STATUS: Record<
    SwapStatus,
    { label: string; variant: 'warning' | 'success' | 'destructive' | 'muted' }
> = {
    pending: { label: 'Diajukan', variant: 'warning' },
    approved: { label: 'Disetujui', variant: 'success' },
    rejected: { label: 'Ditolak', variant: 'destructive' },
    expired: { label: 'Kedaluwarsa', variant: 'muted' },
    cancelled: { label: 'Dibatalkan', variant: 'muted' },
};

const shiftWhen = (s: { date: string; start: string; end: string }) =>
    `${formatDate(s.date)} · ${s.start}–${s.end}`;

function addDays(iso: string, days: number) {
    const date = new Date(`${iso}T00:00:00`);
    date.setDate(date.getDate() + days);

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** FR-AS-03: pilih shift → asisten tujuan (tidak bentrok) → alasan. */
function SwapDialog({
    shifts,
    open,
    onOpenChange,
    initialShift,
}: {
    shifts: MyShift[];
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialShift: number | null;
}) {
    const form = useForm({
        shift_id: initialShift ? String(initialShift) : '',
        to_user_id: '',
        reason: '',
    });
    const [candidates, setCandidates] = useState<
        { id: number; name: string }[] | null
    >(null);
    const swappable = shifts.filter((s) => s.swappable);

    useEffect(() => {
        if (!form.data.shift_id) {
            setCandidates(null);

            return;
        }

        let alive = true;
        setCandidates(null);
        fetch(ShiftSwapController.candidates.url(Number(form.data.shift_id)), {
            headers: { Accept: 'application/json' },
        })
            .then((response) => response.json())
            .then((rows) => alive && setCandidates(rows));

        return () => {
            alive = false;
        };
    }, [form.data.shift_id]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(ShiftSwapController.store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onOpenChange(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Ubah Jadwal · Tukar Shift</DialogTitle>
                    <DialogDescription>
                        Asisten tujuan harus menyetujui. Admin hanya menerima
                        notifikasi. Pengajuan kedaluwarsa 24 jam sebelum shift.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="grid gap-5">
                    <div className="grid gap-2">
                        <Label htmlFor="swap-shift">Shift saya</Label>
                        <select
                            id="swap-shift"
                            required
                            value={form.data.shift_id}
                            onChange={(e) =>
                                form.setData((d) => ({
                                    ...d,
                                    shift_id: e.target.value,
                                    to_user_id: '',
                                }))
                            }
                            className="h-10 border border-input bg-white px-3 text-sm"
                        >
                            <option value="">Pilih shift…</option>
                            {swappable.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {shiftWhen(s)} — {s.title}
                                </option>
                            ))}
                        </select>
                        {swappable.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                Tidak ada shift yang dapat ditukar (minimal 24
                                jam sebelum shift).
                            </p>
                        )}
                        <InputError message={form.errors.shift_id} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="swap-to">Asisten tujuan</Label>
                        <select
                            id="swap-to"
                            required
                            disabled={!candidates}
                            value={form.data.to_user_id}
                            onChange={(e) =>
                                form.setData('to_user_id', e.target.value)
                            }
                            className="h-10 border border-input bg-white px-3 text-sm disabled:opacity-60"
                        >
                            <option value="">
                                {form.data.shift_id && !candidates
                                    ? 'Memuat asisten yang tersedia…'
                                    : 'Pilih asisten…'}
                            </option>
                            {candidates?.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                            Hanya asisten yang tidak memiliki shift bentrok.
                        </p>
                        <InputError message={form.errors.to_user_id} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="swap-reason">Alasan</Label>
                        <Textarea
                            id="swap-reason"
                            required
                            minLength={5}
                            maxLength={500}
                            value={form.data.reason}
                            onChange={(e) =>
                                form.setData('reason', e.target.value)
                            }
                            placeholder="Mis. bentrok jadwal ujian."
                        />
                        <InputError message={form.errors.reason} />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? <Spinner /> : <ArrowLeftRight />}{' '}
                            Kirim Pengajuan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/** Admin: tambah shift jaga lab (berulang mingguan). */
function AddShiftDialog({
    manage,
    open,
    onOpenChange,
}: {
    manage: NonNullable<Props['manage']>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const form = useForm({
        user_id: '',
        // Hanya satu lab → langsung terisi.
        room_id: manage.rooms.length === 1 ? String(manage.rooms[0].id) : '',
        title: 'Jaga Lab',
        date: '',
        start_time: '13:00',
        end_time: '16:00',
        repeat_weeks: '1',
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Tambah Shift Mengawas</DialogTitle>
                    <DialogDescription>
                        Shift jaga lab di luar sesi praktikum. Shift yang
                        bentrok dilewati otomatis.
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(ShiftController.store.url(), {
                            preserveScroll: true,
                            onSuccess: () => {
                                form.reset();
                                onOpenChange(false);
                            },
                        });
                    }}
                    className="grid gap-4"
                >
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="sh-user">Asisten</Label>
                            <select
                                id="sh-user"
                                required
                                value={form.data.user_id}
                                onChange={(e) =>
                                    form.setData('user_id', e.target.value)
                                }
                                className="h-10 border border-input bg-white px-3 text-sm"
                            >
                                <option value="">Pilih…</option>
                                {manage.assistants.map((a) => (
                                    <option key={a.id} value={a.id}>
                                        {a.name}
                                    </option>
                                ))}
                            </select>
                            <InputError message={form.errors.user_id} />
                        </div>
                        <div
                            className={cn(
                                'grid gap-2',
                                manage.rooms.length === 1 && 'hidden',
                            )}
                        >
                            <Label htmlFor="sh-room">Ruang</Label>
                            <select
                                id="sh-room"
                                value={form.data.room_id}
                                onChange={(e) =>
                                    form.setData('room_id', e.target.value)
                                }
                                className="h-10 border border-input bg-white px-3 text-sm"
                            >
                                <option value="">—</option>
                                {manage.rooms.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="sh-title">Kegiatan</Label>
                        <Input
                            id="sh-title"
                            value={form.data.title}
                            onChange={(e) =>
                                form.setData('title', e.target.value)
                            }
                            maxLength={120}
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-4">
                        <div className="grid gap-2 sm:col-span-2">
                            <Label htmlFor="sh-date">Tanggal mulai</Label>
                            <Input
                                id="sh-date"
                                type="date"
                                required
                                value={form.data.date}
                                onChange={(e) =>
                                    form.setData('date', e.target.value)
                                }
                            />
                            <InputError message={form.errors.date} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="sh-start">Mulai</Label>
                            <Input
                                id="sh-start"
                                type="time"
                                required
                                value={form.data.start_time}
                                onChange={(e) =>
                                    form.setData('start_time', e.target.value)
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="sh-end">Selesai</Label>
                            <Input
                                id="sh-end"
                                type="time"
                                required
                                value={form.data.end_time}
                                onChange={(e) =>
                                    form.setData('end_time', e.target.value)
                                }
                            />
                        </div>
                    </div>
                    <InputError message={form.errors.end_time} />
                    <div className="grid gap-2">
                        <Label htmlFor="sh-repeat">
                            Ulangi setiap minggu (jumlah minggu)
                        </Label>
                        <Input
                            id="sh-repeat"
                            type="number"
                            min={1}
                            max={20}
                            value={form.data.repeat_weeks}
                            onChange={(e) =>
                                form.setData('repeat_weeks', e.target.value)
                            }
                            className="w-28"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? <Spinner /> : <Plus />} Tambah
                            Shift
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function SwapItem({
    swap,
    incoming,
}: {
    swap: ShiftSwapRow;
    incoming?: boolean;
}) {
    const status = SWAP_STATUS[swap.status];
    const [busy, setBusy] = useState(false);
    const respond = (approve: boolean) => {
        setBusy(true);
        router.post(
            ShiftSwapController.respond.url(swap.id),
            { approve },
            { preserveScroll: true, onFinish: () => setBusy(false) },
        );
    };

    return (
        <li className="grid gap-2 border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="font-bold">{swap.shift.title}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                        {shiftWhen(swap.shift)}{' '}
                        {swap.shift.room && `· ${swap.shift.room}`}
                    </p>
                </div>
                <Badge variant={status.variant}>{status.label}</Badge>
            </div>
            <p className="text-sm">
                <strong>{swap.from}</strong> → <strong>{swap.to}</strong>: “
                {swap.reason}”
            </p>
            {swap.responseNote && (
                <p className="text-xs text-muted-foreground">
                    Catatan: {swap.responseNote}
                </p>
            )}
            <p className="text-xs text-muted-foreground">
                Diajukan {formatRelative(swap.createdAt)}
            </p>
            {incoming && (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={() => respond(true)}
                        disabled={busy}
                    >
                        <Check /> Setujui
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respond(false)}
                        disabled={busy}
                    >
                        <X /> Tolak
                    </Button>
                </div>
            )}
            {!incoming && swap.status === 'pending' && (
                <Button
                    size="sm"
                    variant="ghost"
                    className="w-fit"
                    onClick={() =>
                        router.delete(
                            ShiftSwapController.destroy.url(swap.id),
                            { preserveScroll: true },
                        )
                    }
                >
                    Batalkan pengajuan
                </Button>
            )}
        </li>
    );
}

/** Asisten › Schedule (FR-AS-01…04) — Figma "Schedule". */
export default function AsistenSchedule({
    week,
    myClassCount,
    allClasses,
    dutyThisWeek,
    myShifts,
    incoming,
    history,
    manage,
}: Props) {
    const [tab, setTab] = useState<'mine' | 'all'>('mine');
    const [day, setDay] = useState<number | null>(null);
    const [swapOpen, setSwapOpen] = useState(false);
    const [swapShift, setSwapShift] = useState<number | null>(null);
    const [addOpen, setAddOpen] = useState(false);
    const byDay = useMemo(() => {
        const days = new Map<number, AllClassRow[]>();
        allClasses.forEach((c) =>
            days.set(c.dayOfWeek, [...(days.get(c.dayOfWeek) ?? []), c]),
        );

        return [...days.entries()].sort(([a], [b]) => a - b);
    }, [allClasses]);

    const goWeek = (start: string | null) =>
        router.get(
            ScheduleController.index.url(
                start ? { query: { week: start } } : undefined,
            ),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                only: ['week', 'dutyThisWeek'],
            },
        );

    return (
        <>
            <Head title="Schedule" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-h1 font-bold text-primary-900">
                            Schedule
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Sistem Pengaturan &amp; Monitoring Praktikum
                            Laboratorium Riset
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {manage && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        router.post(
                                            ShiftController.generate.url(),
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <CalendarCog /> Generate Shift dari Kelas
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setAddOpen(true)}
                                >
                                    <Plus /> Tambah Shift
                                </Button>
                            </>
                        )}
                        <Button
                            onClick={() => {
                                setSwapShift(null);
                                setSwapOpen(true);
                            }}
                        >
                            <Repeat /> Ubah Jadwal
                        </Button>
                    </div>
                </div>

                <div
                    role="tablist"
                    aria-label="Tampilan jadwal"
                    className="flex gap-6 border-b border-primary-200"
                >
                    {(
                        [
                            ['mine', 'Jadwal Saya', `${myClassCount} Kelas`],
                            [
                                'all',
                                'Semua Jadwal',
                                `${allClasses.length} Kelas`,
                            ],
                        ] as const
                    ).map(([value, label, count]) => (
                        <button
                            key={value}
                            role="tab"
                            aria-selected={tab === value}
                            onClick={() => setTab(value)}
                            className={cn(
                                '-mb-px flex items-center gap-2 border-b-2 px-1 pb-2.5 text-sm font-bold',
                                tab === value
                                    ? 'border-primary-700 text-primary-800'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {label}
                            <span className="bg-primary-100 px-2 py-0.5 text-[11px] font-medium text-primary-800">
                                {count}
                            </span>
                        </button>
                    ))}
                </div>

                {tab === 'mine' ? (
                    <>
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => goWeek(addDays(week.start, -7))}
                                aria-label="Minggu sebelumnya"
                            >
                                <ChevronLeft />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => goWeek(null)}
                            >
                                Minggu ini
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => goWeek(addDays(week.start, 7))}
                                aria-label="Minggu berikutnya"
                            >
                                <ChevronRight />
                            </Button>
                        </div>
                        <WeekSchedule
                            weekStart={week.start}
                            today={week.today}
                            events={week.events}
                        />

                        <div className="grid gap-6 xl:grid-cols-3">
                            <section
                                aria-labelledby="my-shifts"
                                className="grid content-start gap-3"
                            >
                                <h2
                                    id="my-shifts"
                                    className="text-h3 font-bold"
                                >
                                    Shift Mendatang
                                </h2>
                                {myShifts.length === 0 ? (
                                    <p className="border bg-card p-4 text-sm text-muted-foreground">
                                        Belum ada shift terjadwal.
                                    </p>
                                ) : (
                                    <ul className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
                                        {myShifts.map((s) => (
                                            <li
                                                key={s.id}
                                                className="flex items-center justify-between gap-3 border bg-card px-4 py-3"
                                            >
                                                <span className="grid">
                                                    <span className="text-sm font-bold">
                                                        {s.title}
                                                    </span>
                                                    <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                                                        <Clock
                                                            className="size-3"
                                                            aria-hidden
                                                        />{' '}
                                                        {shiftWhen(s)}{' '}
                                                        {s.room &&
                                                            `· ${s.room}`}
                                                    </span>
                                                </span>
                                                {s.pendingSwap ? (
                                                    <Badge variant="warning">
                                                        Diajukan
                                                    </Badge>
                                                ) : (
                                                    s.swappable && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => {
                                                                setSwapShift(
                                                                    s.id,
                                                                );
                                                                setSwapOpen(
                                                                    true,
                                                                );
                                                            }}
                                                        >
                                                            <ArrowLeftRight />{' '}
                                                            Tukar
                                                        </Button>
                                                    )
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                            <section
                                aria-labelledby="incoming"
                                className="grid content-start gap-3"
                            >
                                <h2 id="incoming" className="text-h3 font-bold">
                                    Permintaan Masuk{' '}
                                    {incoming.length > 0 && (
                                        <Badge variant="warning">
                                            {incoming.length}
                                        </Badge>
                                    )}
                                </h2>
                                {incoming.length === 0 ? (
                                    <p className="border bg-card p-4 text-sm text-muted-foreground">
                                        Tidak ada permintaan tukar shift.
                                    </p>
                                ) : (
                                    <ul className="grid gap-2">
                                        {incoming.map((s) => (
                                            <SwapItem
                                                key={s.id}
                                                swap={s}
                                                incoming
                                            />
                                        ))}
                                    </ul>
                                )}
                            </section>
                            <section
                                aria-labelledby="history"
                                className="grid content-start gap-3"
                            >
                                <h2 id="history" className="text-h3 font-bold">
                                    Riwayat Tukar Shift
                                </h2>
                                {history.length === 0 ? (
                                    <p className="border bg-card p-4 text-sm text-muted-foreground">
                                        Belum ada riwayat.
                                    </p>
                                ) : (
                                    <ul className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
                                        {history.map((s) => (
                                            <SwapItem key={s.id} swap={s} />
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>
                    </>
                ) : allClasses.length === 0 ? (
                    <EmptyState
                        icon={CalendarCog}
                        title="Belum ada jadwal"
                        description="Belum ada kelas disetujui pada semester aktif."
                    />
                ) : (
                    <>
                        <div
                            className="flex flex-wrap gap-2"
                            role="group"
                            aria-label="Filter hari"
                        >
                            {[
                                [
                                    null,
                                    `Semua Hari (${allClasses.length})`,
                                ] as const,
                                ...byDay.map(
                                    ([d, rows]) =>
                                        [
                                            d,
                                            `${dayName(d)} (${rows.length})`,
                                        ] as const,
                                ),
                            ].map(([value, label]) => (
                                <button
                                    key={label}
                                    type="button"
                                    aria-pressed={day === value}
                                    onClick={() => setDay(value)}
                                    className={cn(
                                        'border px-4 py-1.5 text-sm',
                                        day === value
                                            ? 'border-primary-800 bg-primary-800 text-white'
                                            : 'bg-card hover:bg-primary-50',
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                        {byDay
                            .filter(([d]) => day === null || d === day)
                            .map(([d, rows]) => (
                                <section
                                    key={d}
                                    aria-labelledby={`day-${d}`}
                                    className="grid gap-4"
                                >
                                    <header className="flex flex-wrap items-center justify-between gap-3 border border-primary-200 bg-primary-50 px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="flex size-9 items-center justify-center bg-primary-800 font-mono text-xs font-bold text-white">
                                                {dayName(d)
                                                    .slice(0, 2)
                                                    .toUpperCase()}
                                            </span>
                                            <div>
                                                <h2
                                                    id={`day-${d}`}
                                                    className="font-bold uppercase"
                                                >
                                                    {dayName(d)}
                                                </h2>
                                                <p className="text-xs">
                                                    {rows.length} Sesi Praktikum
                                                    ·{' '}
                                                    {rows.reduce(
                                                        (sum, r) =>
                                                            sum + r.credits,
                                                        0,
                                                    )}{' '}
                                                    SKS Total
                                                </p>
                                            </div>
                                        </div>
                                        <span className="border bg-white px-6 py-1 text-xs">
                                            {[
                                                ...new Set(
                                                    rows
                                                        .map((r) => r.room)
                                                        .filter(Boolean),
                                                ),
                                            ].join(', ')}
                                        </span>
                                    </header>
                                    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                        {rows.map((c) => {
                                            const color =
                                                scheduleColors[c.color];

                                            return (
                                                <li
                                                    key={c.id}
                                                    className={cn(
                                                        'grid gap-3 border-l-4 bg-card p-4 shadow-sm',
                                                        color.accent,
                                                        c.mine &&
                                                            'ring-primary-300 ring-1',
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span
                                                            className={cn(
                                                                'inline-flex items-center gap-1 px-2 py-0.5 font-mono text-xs font-bold',
                                                                color.chip,
                                                                color.text,
                                                            )}
                                                        >
                                                            <Clock
                                                                className="size-3"
                                                                aria-hidden
                                                            />{' '}
                                                            {c.startTime}–
                                                            {c.endTime}
                                                        </span>
                                                        <span className="bg-primary-50 px-2 py-0.5 text-[11px] text-primary-800">
                                                            {c.credits} SKS
                                                        </span>
                                                    </div>
                                                    <p className="text-h3 leading-tight font-bold">
                                                        {c.course}
                                                    </p>
                                                    <p className="flex items-center gap-2 text-xs">
                                                        <span className="bg-primary-50 px-2 py-1">
                                                            {c.name}
                                                        </span>
                                                        <span className="font-mono text-muted-foreground">
                                                            {c.code}
                                                        </span>
                                                        {c.room && (
                                                            <span>
                                                                · {c.room}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <div className="grid gap-1 border-t pt-2">
                                                        <span className="text-[11px] text-muted-foreground">
                                                            Asisten
                                                            Laboratorium:
                                                        </span>
                                                        <span className="flex flex-wrap gap-1">
                                                            {c.assistants.map(
                                                                (a) => (
                                                                    <span
                                                                        key={a}
                                                                        className="bg-primary-100 px-2 py-0.5 text-[11px]"
                                                                    >
                                                                        {a}
                                                                    </span>
                                                                ),
                                                            )}
                                                        </span>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </section>
                            ))}

                        <section aria-labelledby="duty" className="grid gap-3">
                            <h2 id="duty" className="text-h3 font-bold">
                                Jaga Lab Minggu Ini
                            </h2>
                            {dutyThisWeek.length === 0 ? (
                                <p className="border bg-card p-4 text-sm text-muted-foreground">
                                    Tidak ada shift jaga lab minggu ini.
                                </p>
                            ) : (
                                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                    {dutyThisWeek.map((d) => (
                                        <li
                                            key={d.id}
                                            className="flex items-center justify-between gap-2 border border-l-4 border-l-primary-600 bg-card px-4 py-3"
                                        >
                                            <span className="grid">
                                                <span className="text-sm font-bold">
                                                    {d.user}
                                                </span>
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {shiftWhen(d)} ·{' '}
                                                    {d.room ?? '—'}
                                                </span>
                                            </span>
                                            {manage && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    aria-label={`Hapus shift ${d.user}`}
                                                    onClick={() =>
                                                        router.delete(
                                                            ShiftController.destroy.url(
                                                                d.id,
                                                            ),
                                                            {
                                                                preserveScroll: true,
                                                            },
                                                        )
                                                    }
                                                >
                                                    <Trash2 />
                                                </Button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    </>
                )}
            </div>
            <SwapDialog
                key={`${swapShift}-${swapOpen}`}
                shifts={myShifts}
                open={swapOpen}
                onOpenChange={setSwapOpen}
                initialShift={swapShift}
            />
            {manage && (
                <AddShiftDialog
                    manage={manage}
                    open={addOpen}
                    onOpenChange={setAddOpen}
                />
            )}
        </>
    );
}
