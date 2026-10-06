import { Form, Head, Link, router } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpen,
    CalendarCheck,
    CheckCheck,
    CircleCheck,
    CirclePlus,
    CircleStop,
    ClipboardList,
    CopyPlus,
    DoorOpen,
    FilePen,
    MoreVertical,
    Search,
    Send,
    SquarePen,
    Timer,
    TimerReset,
    Trash2,
    Unlock,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import GradeController from '@/actions/App/Http/Controllers/Asisten/GradeController';
import TaskController from '@/actions/App/Http/Controllers/Asisten/TaskController';
import TaskTargetController from '@/actions/App/Http/Controllers/Asisten/TaskTargetController';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { TaskFormDialog } from '@/components/tasks/task-form-dialog';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useNow } from '@/hooks/use-now';
import { formatSchedule } from '@/lib/days';
import { formatCountdown, formatRelative } from '@/lib/datetime';
import { TASK_TYPE_LABEL, TASK_TYPE_SLUG } from '@/lib/task';
import { cn } from '@/lib/utils';
import type {
    TaskFormData,
    TaskFormOptions,
    TaskState,
    TaskType,
} from '@/types';
import type { RouteFormDefinition } from '@/wayfinder';

type Target = {
    id: number;
    classId: number;
    className: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    state: TaskState;
    openAt: string | null;
    dueAt: string | null;
    closedAt: string | null;
    windowMinutes: number | null;
    submitted: number;
    graded: number;
    members: number;
};

type TaskRow = {
    id: number;
    type: TaskType;
    title: string;
    topic: string | null;
    courseId: number;
    course: string;
    courseName: string;
    status: 'draft' | 'published';
    meetingNumber: number | null;
    allowLate: boolean;
    canEdit: boolean;
    targets: Target[];
};

/** Satu kartu Figma = satu tugas untuk satu kelas (atau Draft tanpa kelas). */
type Row = { task: TaskRow; target: Target | null; state: TaskState };

const ALL = 'all';
const STATE_ORDER: Record<TaskState, number> = {
    open: 0,
    scheduled: 1,
    draft: 2,
    closed: 3,
};

const PAGE_TITLE: Record<TaskType, string> = {
    posttest: 'Manajemen Post-Test',
    pretest: 'Manajemen Pre-Test',
    report: 'Manajemen Laporan Praktikum',
};

const clock = (iso: string) =>
    new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(iso));

const dateClock = (iso: string) =>
    new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta',
    }).format(new Date(iso));

/** Jam saja bila hari ini; tanggal + jam bila hari lain (mis. laporan berhari-hari). */
const when = (iso: string, now: number) => {
    const day = (value: number) =>
        new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(
            new Date(value),
        );

    return day(new Date(iso).getTime()) === day(now)
        ? clock(iso)
        : dateClock(iso);
};

const percent = (part: number, whole: number) =>
    whole > 0 ? Math.round((part / whole) * 100) : 0;

/**
 * Figma "Task - Post Test / Pre Test": statistik, filter, dan kartu per kelas
 * dengan panel aksi sesuai status (Live · Terjadwal · Selesai).
 */
export default function TasksIndex({
    type,
    tasks,
    extendOptions,
    openCreate,
    editing,
    courses,
    limits,
}: {
    type: TaskType | null;
    tasks: TaskRow[];
    extendOptions: number[];
    openCreate: boolean;
    editing: TaskFormData | null;
} & TaskFormOptions) {
    const now = useNow();
    const label = type ? TASK_TYPE_LABEL[type] : 'Tugas';
    const indexUrl = TaskController.index.url(
        type ? { type: TASK_TYPE_SLUG[type] } : {},
    );

    const [creating, setCreating] = useState(openCreate);
    const [query, setQuery] = useState('');
    const [courseFilter, setCourseFilter] = useState(ALL);
    const [classFilter, setClassFilter] = useState(ALL);
    const [confirm, setConfirm] = useState<ConfirmState | null>(null);

    useEffect(() => setCreating(openCreate), [openCreate]);

    const rows = useMemo<Row[]>(
        () =>
            tasks
                .flatMap((task): Row[] =>
                    task.targets.length === 0
                        ? [{ task, target: null, state: 'draft' }]
                        : task.targets.map((target) => ({
                              task,
                              target,
                              state: target.state,
                          })),
                )
                .sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state]),
        [tasks],
    );

    const courseOptions = useMemo(
        () =>
            [
                ...new Map(
                    tasks.map((task) => [task.courseId, task.courseName]),
                ),
            ].sort((a, b) => a[1].localeCompare(b[1])),
        [tasks],
    );
    const classOptions = useMemo(
        () =>
            [
                ...new Set(
                    rows
                        .filter(
                            (row) =>
                                courseFilter === ALL ||
                                String(row.task.courseId) === courseFilter,
                        )
                        .flatMap((row) =>
                            row.target ? [row.target.className] : [],
                        ),
                ),
            ].sort(),
        [rows, courseFilter],
    );

    const needle = query.trim().toLowerCase();
    const visible = rows.filter(
        (row) =>
            (courseFilter === ALL ||
                String(row.task.courseId) === courseFilter) &&
            (classFilter === ALL || row.target?.className === classFilter) &&
            (needle === '' ||
                [
                    row.task.title,
                    row.task.topic ?? '',
                    row.task.courseName,
                    row.task.meetingNumber
                        ? `pertemuan ${row.task.meetingNumber}`
                        : '',
                ]
                    .join(' ')
                    .toLowerCase()
                    .includes(needle)),
    );

    const live = rows.filter((row) => row.state === 'open').length;
    const scheduled = rows.filter((row) => row.state === 'scheduled').length;

    const openEdit = (task: TaskRow) =>
        router.visit(TaskController.edit.url(task.id), {
            preserveScroll: true,
            preserveState: true,
        });
    const closeForm = () => {
        setCreating(false);
        if (editing || openCreate) {
            router.visit(indexUrl, {
                preserveScroll: true,
                preserveState: true,
            });
        }
    };

    return (
        <>
            <Head title={type ? PAGE_TITLE[type] : 'Task'} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title={type ? PAGE_TITLE[type] : 'Manajemen Tugas'}
                    description="Kelola distribusi soal, jadwal timer buka/tutup, verifikasi berkas submission mahasiswa, dan publikasi evaluasi per sesi laboratorium secara terpusat."
                    actions={
                        <Button size="lg" onClick={() => setCreating(true)}>
                            <CirclePlus /> Buat Tugas {type ? label : ''}
                        </Button>
                    }
                />

                <div className="grid gap-5 md:grid-cols-2">
                    <StatCard
                        title={`${label} Aktif Berjalan`}
                        value={`${live} Sesi Live`}
                        icon={Timer}
                        iconClass="bg-success-soft text-success"
                        note={
                            live > 0 ? (
                                <span className="flex items-center gap-2 text-success">
                                    <span className="size-2 animate-pulse rounded-full bg-success" />
                                    Sedang countdown
                                </span>
                            ) : (
                                <span className="text-muted-foreground">
                                    Tidak ada sesi yang sedang berjalan
                                </span>
                            )
                        }
                    />
                    <StatCard
                        title="Soal Terjadwal"
                        value={`${scheduled} ${label}`}
                        icon={Send}
                        iconClass="bg-primary-50 text-primary-700"
                        note={
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <CircleCheck
                                    className="size-3.5 text-success"
                                    aria-hidden
                                />
                                Otomatis rilis sesuai jadwal buka
                            </span>
                        }
                    />
                </div>

                <section
                    aria-label={`Daftar ${label}`}
                    className="grid gap-5 border bg-card p-4 md:p-6"
                >
                    <div className="flex flex-wrap gap-3">
                        <div className="relative min-w-60 flex-1 sm:max-w-80">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"
                                aria-hidden
                            />
                            <Input
                                type="search"
                                value={query}
                                onChange={(event) =>
                                    setQuery(event.target.value)
                                }
                                placeholder="Cari pertemuan atau materi"
                                aria-label="Cari pertemuan atau materi"
                                className="h-11 pl-11"
                            />
                        </div>
                        <Select
                            value={courseFilter}
                            onValueChange={(value) => {
                                setCourseFilter(value);
                                setClassFilter(ALL);
                            }}
                        >
                            <SelectTrigger
                                aria-label="Filter mata kuliah"
                                className="w-full justify-start data-[size=default]:h-11 sm:w-72 [&>svg:last-child]:ml-auto"
                            >
                                <BookOpen
                                    className="text-primary-700"
                                    aria-hidden
                                />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    Semua Mata Kuliah
                                </SelectItem>
                                {courseOptions.map(([id, name]) => (
                                    <SelectItem key={id} value={String(id)}>
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={classFilter}
                            onValueChange={setClassFilter}
                        >
                            <SelectTrigger
                                aria-label="Filter kelas"
                                className="w-full justify-start data-[size=default]:h-11 sm:w-72 [&>svg:last-child]:ml-auto"
                            >
                                <DoorOpen
                                    className="text-primary-700"
                                    aria-hidden
                                />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    Semua Kelas
                                    {classOptions.length > 0 &&
                                        ` (${classOptions.map((name) => name.replace(/^Kelas\s+/i, '')).join(', ')})`}
                                </SelectItem>
                                {classOptions.map((name) => (
                                    <SelectItem key={name} value={name}>
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {rows.length === 0 ? (
                        <EmptyState
                            icon={ClipboardList}
                            title={`Belum ada ${label}`}
                            description="Buat tugas pertama untuk kelas yang Anda ampu."
                        />
                    ) : visible.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted-foreground">
                            Tidak ada tugas yang cocok dengan filter.
                        </p>
                    ) : (
                        <ul className="grid gap-4">
                            {visible.map((row) => (
                                <TaskCard
                                    key={`${row.task.id}-${row.target?.id ?? 'draft'}`}
                                    row={row}
                                    now={now}
                                    extendOptions={extendOptions}
                                    onEdit={() => openEdit(row.task)}
                                    onConfirm={setConfirm}
                                />
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <TaskFormDialog
                open={creating || editing !== null}
                onOpenChange={(open) => !open && closeForm()}
                task={editing}
                defaultType={editing?.type ?? type ?? 'posttest'}
                typeLocked={type !== null}
                courses={courses}
                limits={limits}
            />

            <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
        </>
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
    iconClass,
    note,
}: {
    title: string;
    value: string;
    icon: typeof Timer;
    iconClass: string;
    note: ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-4 border bg-card p-5 shadow-[0_4px_12px_rgb(0_0_0/0.06)]">
            <div className="grid gap-3">
                <p className="font-medium">{title}</p>
                <p className="text-[2.5rem] leading-none font-bold">{value}</p>
                <p className="text-xs">{note}</p>
            </div>
            <span
                className={cn(
                    'flex size-11 shrink-0 items-center justify-center',
                    iconClass,
                )}
            >
                <Icon className="size-6" aria-hidden />
            </span>
        </div>
    );
}

const CARD_TONE: Record<TaskState, string> = {
    open: 'border-success',
    scheduled: 'border-primary-700',
    closed: 'border-muted-foreground/40',
    draft: 'border-dashed border-primary-300',
};

const CARD_BAR: Record<TaskState, string> = {
    open: 'bg-success',
    scheduled: 'bg-primary-700',
    closed: 'bg-muted-foreground/40',
    draft: 'bg-primary-200',
};

function StateTag({ state }: { state: TaskState }) {
    const tag = {
        open: {
            className: 'bg-success-soft text-success',
            icon: (
                <span className="size-2 rounded-full bg-success" aria-hidden />
            ),
            text: 'Sedang Berlangsung',
        },
        scheduled: {
            className: 'bg-primary-700 text-white',
            icon: <CalendarCheck className="size-3.5" aria-hidden />,
            text: 'Terjadwal Otomatis',
        },
        closed: {
            className: 'bg-muted text-muted-foreground',
            icon: <CircleCheck className="size-3.5" aria-hidden />,
            text: 'Selesai & Ditutup',
        },
        draft: {
            className:
                'border border-dashed border-primary-300 text-primary-700',
            icon: <FilePen className="size-3.5" aria-hidden />,
            text: 'Draft',
        },
    }[state];

    return (
        <span
            className={cn(
                'inline-flex items-center gap-2 px-3 py-1 text-xs font-medium',
                tag.className,
            )}
        >
            {tag.icon}
            {tag.text}
        </span>
    );
}

function TaskCard({
    row,
    now,
    extendOptions,
    onEdit,
    onConfirm,
}: {
    row: Row;
    now: number;
    extendOptions: number[];
    onEdit: () => void;
    onConfirm: (state: ConfirmState) => void;
}) {
    const { task, target, state } = row;
    const label = TASK_TYPE_LABEL[task.type];
    const deletable =
        task.canEdit && task.targets.every((t) => t.submitted === 0);

    return (
        <li
            className={cn(
                'relative grid border bg-card lg:grid-cols-[minmax(0,1fr)_22rem]',
                CARD_TONE[state],
            )}
        >
            <span
                aria-hidden
                className={cn(
                    'absolute inset-y-0 left-0 w-1.5',
                    CARD_BAR[state],
                )}
            />
            {/* Kiri: info tugas */}
            <div className="grid content-start gap-3 py-4 pr-4 pl-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <StateTag state={state} />
                        <span className="bg-primary-50 px-3 py-1 text-xs font-medium">
                            {label}
                            {task.meetingNumber
                                ? ` Pertemuan Ke - ${task.meetingNumber}`
                                : ''}
                        </span>
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="-mt-1 -mr-2 size-8"
                                aria-label={`Aksi lain untuk ${task.title}`}
                            >
                                <MoreVertical />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-44">
                            <DropdownMenuLabel className="max-w-56 truncate">
                                {task.title}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={onEdit}>
                                <SquarePen />
                                {task.canEdit ? 'Edit soal' : 'Lihat soal'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onSelect={() =>
                                    router.post(
                                        TaskController.duplicate.url(task.id),
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                <CopyPlus /> Duplikasi
                            </DropdownMenuItem>
                            {deletable && (
                                <DropdownMenuItem
                                    variant="destructive"
                                    onSelect={() =>
                                        onConfirm({
                                            title: `Hapus “${task.title}”?`,
                                            description:
                                                'Tugas, semua kelas tujuan, dan lampirannya dihapus permanen.',
                                            action: TaskController.destroy.form(
                                                task.id,
                                            ),
                                            confirmLabel: 'Hapus',
                                            destructive: true,
                                        })
                                    }
                                >
                                    <Trash2 /> Hapus
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <h3 className="text-h3 leading-snug font-bold">
                    <button
                        type="button"
                        onClick={onEdit}
                        className="text-left hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                        {task.title}
                    </button>
                </h3>

                <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs">
                    <div className="flex gap-1">
                        <dt>Mata Kuliah:</dt>
                        <dd>{task.courseName}</dd>
                    </div>
                    {target && (
                        <div className="flex gap-1">
                            <dt className="sr-only">Kelas:</dt>
                            <dd>
                                {target.className} (
                                {formatSchedule(
                                    target.dayOfWeek,
                                    target.startTime,
                                    target.endTime,
                                )}{' '}
                                WIB)
                            </dd>
                        </div>
                    )}
                    {task.topic && (
                        <div className="flex min-w-0 gap-1">
                            <dt>Topik:</dt>
                            <dd className="truncate">{task.topic}</dd>
                        </div>
                    )}
                </dl>

                <TimeLine row={row} now={now} />
            </div>

            {/* Kanan: panel aksi sesuai status */}
            <div className="grid content-between gap-3 border-t p-4 lg:border-t-0 lg:border-l">
                <ActionPanel
                    row={row}
                    now={now}
                    extendOptions={extendOptions}
                    onEdit={onEdit}
                    onConfirm={onConfirm}
                />
            </div>
        </li>
    );
}

function TimeLine({ row, now }: { row: Row; now: number }) {
    const { task, target, state } = row;

    if (!target || state === 'draft') {
        return (
            <p className="mt-1 text-xs text-muted-foreground">
                {target
                    ? 'Belum diterbitkan — praktikan belum dapat melihat tugas ini.'
                    : 'Belum ada kelas tujuan. Lengkapi alokasi & waktu, lalu publikasikan.'}
            </p>
        );
    }

    if (state === 'open') {
        return (
            <div className="mt-1 flex flex-wrap items-end gap-x-6 gap-y-2">
                {target.openAt && (
                    <TimeStamp
                        icon={Timer}
                        tone="text-success"
                        caption="Buka:"
                        value={`${when(target.openAt, now)} WIB`}
                    />
                )}
                {target.dueAt && (
                    <TimeStamp
                        icon={Timer}
                        tone="text-danger"
                        caption="Tutup:"
                        value={`${when(target.dueAt, now)} WIB`}
                    />
                )}
                {target.dueAt && (
                    <span className="font-mono text-xs">
                        {new Date(target.dueAt).getTime() > now
                            ? `sisa ${formatCountdown(target.dueAt, now)}`
                            : `terlambat diterima · tenggat ${formatRelative(target.dueAt, now)}`}
                    </span>
                )}
            </div>
        );
    }

    if (state === 'scheduled') {
        return (
            <div className="mt-1">
                <TimeStamp
                    icon={Timer}
                    tone="text-primary-700"
                    caption="Otomatis Buka:"
                    value={
                        target.openAt
                            ? `${dateClock(target.openAt)} WIB${target.dueAt ? ` · tutup ${dateClock(target.dueAt)} WIB` : ''}`
                            : target.windowMinutes
                              ? `Saat sesi pertemuan ${task.meetingNumber ?? ''} dimulai (Durasi: ${target.windowMinutes} Menit)`
                              : 'Waktu buka belum diatur'
                    }
                />
            </div>
        );
    }

    return (
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-success">
            <span className="flex items-center gap-1.5">
                <CheckCheck className="size-4" aria-hidden />
                {target.submitted}/{target.members} Mahasiswa Mengumpulkan
            </span>
            {(target.closedAt ?? target.dueAt) && (
                <span className="text-muted-foreground">
                    Ditutup {dateClock((target.closedAt ?? target.dueAt)!)} WIB
                </span>
            )}
        </p>
    );
}

function TimeStamp({
    icon: Icon,
    tone,
    caption,
    value,
}: {
    icon: typeof Timer;
    tone: string;
    caption: string;
    value: string;
}) {
    return (
        <span className={cn('flex items-center gap-2', tone)}>
            <Icon className="size-6 shrink-0" aria-hidden />
            <span className="grid text-xs leading-tight">
                <span>{caption}</span>
                <strong>{value}</strong>
            </span>
        </span>
    );
}

function ActionPanel({
    row,
    now,
    extendOptions,
    onEdit,
    onConfirm,
}: {
    row: Row;
    now: number;
    extendOptions: number[];
    onEdit: () => void;
    onConfirm: (state: ConfirmState) => void;
}) {
    const { task, target, state } = row;
    const label = TASK_TYPE_LABEL[task.type];

    if (!target || state === 'draft') {
        return (
            <>
                <div className="grid gap-1">
                    <p className="font-bold">Belum Dipublikasikan</p>
                    <p className="text-xs text-muted-foreground">
                        Simpan sebagai draft dapat dilanjutkan kapan saja.
                    </p>
                </div>
                <Button variant="outline" onClick={onEdit}>
                    <SquarePen /> Lanjutkan Edit
                </Button>
            </>
        );
    }

    if (state === 'open') {
        const pct = percent(target.submitted, target.members);

        return (
            <>
                <div className="grid gap-2">
                    <p className="font-bold">Progress Submission</p>
                    <ProgressBar value={pct} tone="bg-success" />
                    <p className="text-xs text-success">
                        {target.submitted} / {target.members} Terkumpul ({pct}
                        %)
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button className="bg-success-soft text-success hover:bg-success/15">
                                <TimerReset /> Tambah Waktu
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuLabel>
                                Perpanjang tenggat {target.className}
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {extendOptions.map((minutes) => (
                                <DropdownMenuItem
                                    key={minutes}
                                    onSelect={() =>
                                        router.post(
                                            TaskTargetController.extend.url(
                                                target.id,
                                            ),
                                            { minutes },
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    +{minutes} menit
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        className="bg-danger-soft text-danger hover:bg-danger/15"
                        onClick={() =>
                            onConfirm({
                                title: `Hentikan ${label} untuk ${target.className}?`,
                                description: `Form langsung dikunci; ${target.members - target.submitted} praktikan yang belum mengumpulkan tidak dapat mengumpulkan lagi. Anda masih bisa membukanya kembali lewat Tambah Waktu.`,
                                action: TaskTargetController.close.form(
                                    target.id,
                                ),
                                confirmLabel: 'Berhenti',
                                destructive: true,
                            })
                        }
                    >
                        <CircleStop /> Berhenti
                    </Button>
                </div>
            </>
        );
    }

    if (state === 'scheduled') {
        return (
            <>
                <div className="grid gap-2">
                    <p className="font-bold">
                        {label} akan muncul sesuai jadwal
                    </p>
                    <ProgressBar value={0} tone="bg-primary" />
                    <p className="text-xs text-primary-700">
                        {target.openAt
                            ? `Soal dirilis otomatis ${formatRelative(target.openAt, now)}.`
                            : target.windowMinutes
                              ? 'Soal dirilis otomatis saat asisten memulai sesi pertemuan.'
                              : 'Atur waktu buka agar soal dapat dirilis.'}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={onEdit}>
                        <SquarePen /> Edit Soal
                    </Button>
                    <Button
                        onClick={() =>
                            onConfirm({
                                title: `Buka ${label} untuk ${target.className} sekarang?`,
                                description: target.dueAt
                                    ? `Soal langsung terlihat oleh praktikan dan diberi notifikasi. Batas pengumpulan mengikuti tenggat yang sudah diatur.`
                                    : `Soal langsung terlihat oleh praktikan dan diberi notifikasi, dengan batas ${target.windowMinutes ?? 60} menit dari sekarang.`,
                                action: TaskTargetController.open.form(
                                    target.id,
                                ),
                                confirmLabel: 'Buka Sekarang',
                            })
                        }
                    >
                        <Unlock /> Buka Manual
                    </Button>
                </div>
            </>
        );
    }

    const pct = percent(target.graded, target.submitted);

    return (
        <>
            <div className="grid gap-2">
                <p className="font-bold">Status Nilai Asisten</p>
                <p className="text-sm text-muted-foreground">
                    {target.graded}/{target.submitted} Sudah Dinilai ({pct}%)
                </p>
            </div>
            <Button asChild className="justify-between">
                <Link
                    href={GradeController.index.url(
                        { type: TASK_TYPE_SLUG[task.type] },
                        {
                            query: {
                                class: target.classId,
                                target: target.id,
                            },
                        },
                    )}
                >
                    Ke Halaman Grade <ArrowRight />
                </Link>
            </Button>
        </>
    );
}

function ProgressBar({ value, tone }: { value: number; tone: string }) {
    return (
        <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
            className="h-2 bg-primary-50"
        >
            <div
                className={cn('h-full transition-[width]', tone)}
                style={{ width: `${value}%` }}
            />
        </div>
    );
}

type ConfirmState = {
    title: string;
    description: string;
    action: RouteFormDefinition<'post'>;
    confirmLabel: string;
    destructive?: boolean;
};

/** Satu dialog konfirmasi untuk Berhenti, Buka Manual, dan Hapus. */
function ConfirmDialog({
    state,
    onClose,
}: {
    state: ConfirmState | null;
    onClose: () => void;
}) {
    return (
        <Dialog
            open={state !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent
                className={cn(state?.destructive && 'border-t-danger')}
            >
                {state && (
                    <>
                        <DialogHeader>
                            <DialogTitle>{state.title}</DialogTitle>
                            <DialogDescription>
                                {state.description}
                            </DialogDescription>
                        </DialogHeader>
                        <Form
                            {...state.action}
                            options={{ preserveScroll: true }}
                            onSuccess={onClose}
                        >
                            {({ processing }) => (
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline">
                                            Batal
                                        </Button>
                                    </DialogClose>
                                    <Button
                                        type="submit"
                                        variant={
                                            state.destructive
                                                ? 'destructive'
                                                : 'default'
                                        }
                                        disabled={processing}
                                    >
                                        {processing && <Spinner />}
                                        {state.confirmLabel}
                                    </Button>
                                </DialogFooter>
                            )}
                        </Form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
