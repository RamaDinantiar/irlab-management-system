import { Form } from '@inertiajs/react';
import {
    Bell,
    Clock,
    Copy,
    FilePlus2,
    FileText,
    Paperclip,
    Save,
    Send,
    ShieldCheck,
    SlidersHorizontal,
    Star,
    Users,
    X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import TaskController from '@/actions/App/Http/Controllers/Asisten/TaskController';
import InputError from '@/components/input-error';
import { RichTextEditor } from '@/components/rich-text/rich-text-editor';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { formatSchedule } from '@/lib/days';
import { formatFileSize } from '@/lib/files';
import { TASK_TYPE_LABEL, toLocalInput } from '@/lib/task';
import { cn } from '@/lib/utils';
import type { TaskFormData, TaskFormOptions, TaskType } from '@/types';

type TargetDraft = {
    included: boolean;
    openAt: string;
    dueAt: string;
    withSession: boolean;
    windowMinutes: string;
};

const TITLE_MAX = 150;
const MEETINGS = Array.from({ length: 16 }, (_, i) => i + 1);
const WINDOW_OPTIONS = [5, 10, 15, 20, 30, 45, 60, 90, 120];
const NO_MEETING = 'none';

/** Kartu bagian form — Figma: kotak putih bergaris, judul ikon + teks tebal. */
function Card({
    icon: Icon,
    title,
    aside,
    children,
    className,
}: {
    icon?: typeof Users;
    title?: string;
    aside?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section className={cn('grid gap-4 border bg-card p-5', className)}>
            {title && (
                <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2.5 text-sm font-bold">
                        {Icon && (
                            <Icon
                                className="size-5 text-primary-700"
                                aria-hidden
                            />
                        )}
                        {title}
                    </h3>
                    {aside}
                </div>
            )}
            {children}
        </section>
    );
}

function Required() {
    return (
        <span className="text-danger" aria-hidden>
            *
        </span>
    );
}

/**
 * Figma "Task - Input Post Test / Pre Test": pop-up dua kolom untuk membuat
 * atau mengubah tugas. Kiri: soal (judul, mata kuliah, pertemuan, topik,
 * instruksi, lampiran). Kanan: alokasi kelas, waktu, penilaian.
 * Satu tugas tetap dapat ditujukan ke beberapa kelas (FR-AT-03).
 */
export function TaskFormDialog({
    open,
    onOpenChange,
    task,
    defaultType,
    typeLocked,
    courses,
    limits,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: TaskFormData | null;
    defaultType: TaskType;
    /** Halaman per jenis (Post-Test/Pre-Test/Laporan) mengunci jenis tugas. */
    typeLocked: boolean;
} & TaskFormOptions) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="flex max-h-[94svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1170px,calc(100%-2rem))] [&>button:last-child]:hidden"
                onInteractOutside={(event) => event.preventDefault()}
                onOpenAutoFocus={(event) => {
                    // Fokus awal ke Judul, bukan tombol tutup.
                    event.preventDefault();
                    document.getElementById('task-title')?.focus();
                }}
            >
                {/* key: setiap tugas/pembukaan memulai form dengan nilai segar. */}
                <TaskFormBody
                    key={task?.id ?? 'new'}
                    task={task}
                    defaultType={defaultType}
                    typeLocked={typeLocked}
                    courses={courses}
                    limits={limits}
                    onDone={() => onOpenChange(false)}
                />
            </DialogContent>
        </Dialog>
    );
}

function TaskFormBody({
    task,
    defaultType,
    typeLocked,
    courses,
    limits,
    onDone,
}: {
    task: TaskFormData | null;
    defaultType: TaskType;
    typeLocked: boolean;
    onDone: () => void;
} & TaskFormOptions) {
    const [type, setType] = useState<TaskType>(task?.type ?? defaultType);
    const [courseId, setCourseId] = useState<number | null>(
        task?.courseId ?? courses[0]?.id ?? null,
    );
    const [title, setTitle] = useState(task?.title ?? '');
    const [meeting, setMeeting] = useState(
        task?.meetingNumber ? String(task.meetingNumber) : NO_MEETING,
    );
    const [allowLate, setAllowLate] = useState(task?.allowLate ?? false);
    const [files, setFiles] = useState<File[]>([]);
    const [removed, setRemoved] = useState<number[]>([]);
    const fileInput = useRef<HTMLInputElement>(null);
    const intent = useRef<HTMLInputElement>(null);
    const course = courses.find((option) => option.id === courseId);
    const label = TASK_TYPE_LABEL[type];

    const initialTargets = (id: number | null): Record<number, TargetDraft> =>
        Object.fromEntries(
            (courses.find((option) => option.id === id)?.classes ?? []).map(
                (klass) => {
                    const saved = task?.targets.find(
                        (target) => target.classId === klass.id,
                    );

                    return [
                        klass.id,
                        {
                            included: !!saved || !task,
                            openAt: toLocalInput(saved?.openAt),
                            dueAt: toLocalInput(saved?.dueAt),
                            withSession:
                                !!saved?.windowMinutes && !saved?.openAt,
                            windowMinutes: String(saved?.windowMinutes ?? 20),
                        },
                    ];
                },
            ),
        );
    const [targets, setTargets] = useState<Record<number, TargetDraft>>(() =>
        initialTargets(courseId),
    );
    const update = (classId: number, patch: Partial<TargetDraft>) =>
        setTargets((current) => ({
            ...current,
            [classId]: { ...current[classId], ...patch },
        }));
    const included = (course?.classes ?? []).filter(
        (klass) => targets[klass.id]?.included,
    );

    // File baru dikumpulkan bertahap; input disinkronkan via DataTransfer.
    const syncFiles = (next: File[]) => {
        setFiles(next);
        if (fileInput.current) {
            const transfer = new DataTransfer();
            next.forEach((file) => transfer.items.add(file));
            fileInput.current.files = transfer.files;
        }
    };
    const keptAttachments = (task?.attachments ?? []).filter(
        (file) => !removed.includes(file.id),
    );
    const attachmentCount = keptAttachments.length + files.length;

    const readOnly = task !== null && !task.canEdit;
    const published = task?.status === 'published';
    let targetIndex = 0;

    if (courses.length === 0) {
        return (
            <div className="grid gap-4 p-6">
                <DialogTitle className="text-h2">Buat {label}</DialogTitle>
                <DialogDescription className="border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
                    Anda belum mengampu mata kuliah yang disetujui pada semester
                    aktif.
                </DialogDescription>
                <DialogClose asChild>
                    <Button variant="outline" className="w-fit">
                        Tutup
                    </Button>
                </DialogClose>
            </div>
        );
    }

    return (
        <Form
            {...(task
                ? TaskController.update.form(task.id)
                : TaskController.store.form())}
            options={{ preserveScroll: true }}
            onSuccess={onDone}
            className="flex min-h-0 flex-1 flex-col"
        >
            {({ processing, errors }) => (
                <>
                    <input
                        ref={intent}
                        type="hidden"
                        name="intent"
                        defaultValue="draft"
                    />
                    <input type="hidden" name="type" value={type} />
                    <input
                        type="hidden"
                        name="meeting_number"
                        value={meeting === NO_MEETING ? '' : meeting}
                    />
                    <input
                        type="hidden"
                        name="allow_late"
                        value={allowLate ? '1' : '0'}
                    />
                    {removed.map((id) => (
                        <input
                            key={id}
                            type="hidden"
                            name="remove_attachments[]"
                            value={id}
                        />
                    ))}

                    {/* Header */}
                    <div className="flex items-start gap-4 border-b px-5 py-5 md:px-6">
                        <span className="flex size-12 shrink-0 items-center justify-center border border-primary-200 bg-primary-50 text-primary-700">
                            <FileText className="size-6" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                                <DialogTitle className="text-h2 leading-tight font-bold">
                                    {task
                                        ? readOnly
                                            ? label
                                            : `Ubah ${label}`
                                        : `Buat ${label}`}
                                </DialogTitle>
                                <Badge
                                    variant="secondary"
                                    className="border-primary-300"
                                >
                                    Formulir Kurikulum Lab
                                </Badge>
                                {task && (
                                    <StatusBadge
                                        status={published ? 'open' : 'draft'}
                                        label={published ? 'Terbit' : 'Draft'}
                                    />
                                )}
                            </div>
                            <DialogDescription className="mt-1 text-sm">
                                {readOnly
                                    ? 'Tugas ini sudah memiliki pengumpulan dan tidak dapat diubah lagi.'
                                    : 'Praktikan hanya melihat tugas yang sudah terbit pada waktu bukanya.'}
                            </DialogDescription>
                        </div>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Tutup"
                                className="-mt-1 -mr-2 text-muted-foreground"
                            >
                                <X className="size-6" />
                            </Button>
                        </DialogClose>
                    </div>

                    {/* Isi */}
                    <div className="min-h-0 flex-1 overflow-y-auto bg-background/40 px-5 py-5 md:px-6">
                        {Object.keys(errors).length > 0 && (
                            <p
                                role="alert"
                                className="mb-4 border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-danger"
                            >
                                Periksa kembali isian yang ditandai merah.
                            </p>
                        )}
                        <fieldset
                            disabled={readOnly}
                            className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,410px)]"
                        >
                            {/* Kolom kiri — soal */}
                            <div className="grid gap-5">
                                {!task && !typeLocked && (
                                    <Card>
                                        <div className="grid gap-2">
                                            <span
                                                id="type-label"
                                                className="text-sm font-bold"
                                            >
                                                Jenis Tugas <Required />
                                            </span>
                                            <div
                                                role="radiogroup"
                                                aria-labelledby="type-label"
                                                className="flex flex-wrap"
                                            >
                                                {(
                                                    Object.keys(
                                                        TASK_TYPE_LABEL,
                                                    ) as TaskType[]
                                                ).map((value) => (
                                                    <label
                                                        key={value}
                                                        className={cn(
                                                            'cursor-pointer border px-4 py-2 text-sm font-medium has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40',
                                                            type === value
                                                                ? 'border-primary-700 bg-primary-700 text-white'
                                                                : 'bg-white hover:bg-primary-50',
                                                        )}
                                                    >
                                                        <input
                                                            type="radio"
                                                            checked={
                                                                type === value
                                                            }
                                                            onChange={() =>
                                                                setType(value)
                                                            }
                                                            className="sr-only"
                                                        />
                                                        {TASK_TYPE_LABEL[value]}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </Card>
                                )}

                                <Card>
                                    <div className="grid gap-2">
                                        <div className="flex items-baseline justify-between gap-3">
                                            <Label
                                                htmlFor="task-title"
                                                className="font-bold"
                                            >
                                                Judul {label} <Required />
                                            </Label>
                                            <span
                                                className="text-xs text-muted-foreground"
                                                aria-live="polite"
                                            >
                                                {title.length}/{TITLE_MAX}{' '}
                                                karakter
                                            </span>
                                        </div>
                                        <Input
                                            id="task-title"
                                            name="title"
                                            required
                                            maxLength={TITLE_MAX}
                                            value={title}
                                            onChange={(event) =>
                                                setTitle(event.target.value)
                                            }
                                            placeholder={`${label}: Room Database, Entities & MVVM`}
                                            className="h-11"
                                            aria-invalid={!!errors.title}
                                        />
                                        <InputError message={errors.title} />
                                    </div>
                                </Card>

                                <Card
                                    icon={SlidersHorizontal}
                                    title="Pengaturan Kelas & Modul Terkait"
                                >
                                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="task-course"
                                                className="font-bold"
                                            >
                                                Pilih Mata Kuliah <Required />
                                            </Label>
                                            {task ? (
                                                <p className="flex h-11 items-center border bg-muted/40 px-3 text-sm">
                                                    {course?.label}
                                                </p>
                                            ) : (
                                                <Select
                                                    name="course_id"
                                                    value={
                                                        courseId
                                                            ? String(courseId)
                                                            : undefined
                                                    }
                                                    onValueChange={(value) => {
                                                        setCourseId(
                                                            Number(value),
                                                        );
                                                        setTargets(
                                                            initialTargets(
                                                                Number(value),
                                                            ),
                                                        );
                                                    }}
                                                >
                                                    <SelectTrigger
                                                        id="task-course"
                                                        className="w-full data-[size=default]:h-11"
                                                    >
                                                        <SelectValue placeholder="Pilih mata kuliah" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {courses.map(
                                                            (option) => (
                                                                <SelectItem
                                                                    key={
                                                                        option.id
                                                                    }
                                                                    value={String(
                                                                        option.id,
                                                                    )}
                                                                >
                                                                    {
                                                                        option.label
                                                                    }
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                            <InputError
                                                message={errors.course_id}
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="task-meeting"
                                                className="font-bold"
                                            >
                                                Pertemuan Ke-
                                                {type === 'pretest' && (
                                                    <Required />
                                                )}
                                            </Label>
                                            <Select
                                                value={meeting}
                                                onValueChange={setMeeting}
                                            >
                                                <SelectTrigger
                                                    id="task-meeting"
                                                    className="w-full data-[size=default]:h-11"
                                                    aria-invalid={
                                                        !!errors.meeting_number
                                                    }
                                                >
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem
                                                        value={NO_MEETING}
                                                    >
                                                        Tidak terkait
                                                    </SelectItem>
                                                    {MEETINGS.map((n) => (
                                                        <SelectItem
                                                            key={n}
                                                            value={String(n)}
                                                        >
                                                            Pertemuan{' '}
                                                            {String(n).padStart(
                                                                2,
                                                                '0',
                                                            )}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <InputError
                                                message={errors.meeting_number}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2 border-t pt-4">
                                        <Label
                                            htmlFor="task-topic"
                                            className="font-bold"
                                        >
                                            Topik / Pembahasan Praktikum
                                        </Label>
                                        <Input
                                            id="task-topic"
                                            name="topic"
                                            maxLength={255}
                                            defaultValue={task?.topic ?? ''}
                                            placeholder="Arsitektur Room DB, Entity & DAO, ViewModel Binding"
                                            className="h-11"
                                        />
                                        <InputError message={errors.topic} />
                                    </div>
                                </Card>

                                <Card
                                    icon={FileText}
                                    title="Instruksi & Petunjuk Pengerjaan Mahasiswa"
                                >
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="task-body"
                                            className="sr-only"
                                        >
                                            Instruksi
                                        </Label>
                                        <RichTextEditor
                                            id="task-body"
                                            name="body"
                                            defaultValue={task?.body}
                                            placeholder="Tulis soal & petunjuk pengerjaan, sisipkan blok kode bila perlu…"
                                            invalid={!!errors.body}
                                        />
                                        <InputError message={errors.body} />
                                    </div>
                                </Card>

                                <Card
                                    icon={Paperclip}
                                    title="Lampiran Berkas Pendukung"
                                    aside={
                                        <span className="text-xs text-muted-foreground">
                                            {attachmentCount} berkas terlampir
                                        </span>
                                    }
                                >
                                    {attachmentCount > 0 && (
                                        <ul className="grid gap-3 sm:grid-cols-2">
                                            {keptAttachments.map((file) => (
                                                <AttachmentCard
                                                    key={`saved-${file.id}`}
                                                    name={file.name}
                                                    meta={formatFileSize(
                                                        file.size,
                                                    )}
                                                    href={file.url}
                                                    onRemove={
                                                        readOnly
                                                            ? undefined
                                                            : () =>
                                                                  setRemoved(
                                                                      (
                                                                          current,
                                                                      ) => [
                                                                          ...current,
                                                                          file.id,
                                                                      ],
                                                                  )
                                                    }
                                                />
                                            ))}
                                            {files.map((file, index) => (
                                                <AttachmentCard
                                                    key={`new-${file.name}-${index}`}
                                                    name={file.name}
                                                    meta={`${formatFileSize(file.size)} · baru`}
                                                    onRemove={() =>
                                                        syncFiles(
                                                            files.filter(
                                                                (_, i) =>
                                                                    i !== index,
                                                            ),
                                                        )
                                                    }
                                                />
                                            ))}
                                        </ul>
                                    )}
                                    <input
                                        ref={fileInput}
                                        id="task-attachments"
                                        name="attachments[]"
                                        type="file"
                                        multiple
                                        accept=".pdf,.zip,.jpg,.jpeg,.png"
                                        className="sr-only"
                                        tabIndex={-1}
                                        onChange={(event) => {
                                            const picked = Array.from(
                                                event.target.files ?? [],
                                            );
                                            syncFiles([...files, ...picked]);
                                        }}
                                    />
                                    {!readOnly &&
                                        attachmentCount <
                                            limits.attachments && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    fileInput.current?.click()
                                                }
                                                className="border-primary-300 flex items-center justify-center gap-2 border-2 border-dashed px-4 py-3 text-sm font-medium text-primary-700 hover:bg-primary-50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
                                            >
                                                <FilePlus2
                                                    className="size-4"
                                                    aria-hidden
                                                />
                                                Tambahkan materi referensi atau
                                                lembar kerja praktikan
                                            </button>
                                        )}
                                    <p className="text-xs text-muted-foreground">
                                        PDF, ZIP, atau gambar · maks.{' '}
                                        {limits.attachmentMb} MB per file ·
                                        maks. {limits.attachments} file.
                                    </p>
                                    <InputError
                                        message={
                                            errors.attachments ??
                                            Object.entries(errors).find(
                                                ([key]) =>
                                                    key.startsWith(
                                                        'attachments.',
                                                    ),
                                            )?.[1]
                                        }
                                    />
                                </Card>
                            </div>

                            {/* Kolom kanan — alokasi, waktu, penilaian */}
                            <div className="grid gap-5">
                                <Card icon={Users} title="Alokasi Penugasan">
                                    {!course || course.classes.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Mata kuliah ini belum memiliki kelas
                                            yang Anda ampu.
                                        </p>
                                    ) : (
                                        <ul className="grid gap-2.5">
                                            {course.classes.map((klass) => {
                                                const on =
                                                    !!targets[klass.id]
                                                        ?.included;

                                                return (
                                                    <li key={klass.id}>
                                                        <label
                                                            className={cn(
                                                                'flex cursor-pointer items-center gap-3 border px-4 py-3 transition-colors has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40',
                                                                on
                                                                    ? 'border-primary-300 bg-primary-50'
                                                                    : 'bg-white hover:bg-primary-50/50',
                                                            )}
                                                        >
                                                            <span className="min-w-0 flex-1">
                                                                <span className="block font-bold text-primary-700">
                                                                    Semua
                                                                    Praktikan{' '}
                                                                    {
                                                                        klass.label
                                                                    }
                                                                </span>
                                                                <span className="block text-xs">
                                                                    {
                                                                        klass.members
                                                                    }{' '}
                                                                    mahasiswa
                                                                    terdaftar
                                                                    aktif ·{' '}
                                                                    {formatSchedule(
                                                                        klass.dayOfWeek,
                                                                        klass.startTime,
                                                                        klass.endTime,
                                                                    )}
                                                                </span>
                                                            </span>
                                                            <Checkbox
                                                                checked={on}
                                                                onCheckedChange={(
                                                                    checked,
                                                                ) =>
                                                                    update(
                                                                        klass.id,
                                                                        {
                                                                            included:
                                                                                checked ===
                                                                                true,
                                                                        },
                                                                    )
                                                                }
                                                                className="size-5"
                                                                aria-label={`Tugaskan ke ${klass.label}`}
                                                            />
                                                        </label>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                    <InputError message={errors.targets} />
                                </Card>

                                <Card
                                    icon={Clock}
                                    title="Waktu Pengerjaan"
                                    aside={
                                        <span className="bg-primary-50 px-2 py-0.5 font-mono text-xs text-primary-700">
                                            WIB (GMT+7)
                                        </span>
                                    }
                                >
                                    {included.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Pilih kelas pada Alokasi Penugasan
                                            untuk mengatur waktu buka & batas
                                            pengumpulan.
                                        </p>
                                    ) : (
                                        <ul className="grid gap-4">
                                            {included.map((klass) => {
                                                const target =
                                                    targets[klass.id];
                                                const index = targetIndex++;
                                                const prefix = `targets[${index}]`;
                                                const session =
                                                    type === 'pretest' &&
                                                    target.withSession;
                                                const error =
                                                    errors[
                                                        `targets.${index}.due_at`
                                                    ] ??
                                                    errors[
                                                        `targets.${index}.class_id`
                                                    ];

                                                return (
                                                    <li
                                                        key={klass.id}
                                                        className="grid gap-3 border-b pb-4 last:border-b-0 last:pb-0"
                                                    >
                                                        <input
                                                            type="hidden"
                                                            name={`${prefix}[class_id]`}
                                                            value={klass.id}
                                                        />
                                                        {included.length >
                                                            1 && (
                                                            <p className="text-sm font-bold text-primary-700">
                                                                {klass.label}
                                                            </p>
                                                        )}
                                                        {type === 'pretest' && (
                                                            <label className="flex items-start gap-2 text-sm">
                                                                <Checkbox
                                                                    checked={
                                                                        target.withSession
                                                                    }
                                                                    onCheckedChange={(
                                                                        checked,
                                                                    ) =>
                                                                        update(
                                                                            klass.id,
                                                                            {
                                                                                withSession:
                                                                                    checked ===
                                                                                    true,
                                                                            },
                                                                        )
                                                                    }
                                                                    className="mt-0.5"
                                                                />
                                                                Buka otomatis
                                                                saat sesi
                                                                pertemuan
                                                                dimulai
                                                            </label>
                                                        )}
                                                        {session ? (
                                                            <div className="grid gap-1.5">
                                                                <Label
                                                                    htmlFor={`window-${klass.id}`}
                                                                    className="text-xs font-bold"
                                                                >
                                                                    Batas Waktu
                                                                    Pengerjaan
                                                                </Label>
                                                                <input
                                                                    type="hidden"
                                                                    name={`${prefix}[window_minutes]`}
                                                                    value={
                                                                        target.windowMinutes
                                                                    }
                                                                />
                                                                <Select
                                                                    value={
                                                                        target.windowMinutes
                                                                    }
                                                                    onValueChange={(
                                                                        value,
                                                                    ) =>
                                                                        update(
                                                                            klass.id,
                                                                            {
                                                                                windowMinutes:
                                                                                    value,
                                                                            },
                                                                        )
                                                                    }
                                                                >
                                                                    <SelectTrigger
                                                                        id={`window-${klass.id}`}
                                                                        className="w-full data-[size=default]:h-11"
                                                                    >
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {WINDOW_OPTIONS.map(
                                                                            (
                                                                                minutes,
                                                                            ) => (
                                                                                <SelectItem
                                                                                    key={
                                                                                        minutes
                                                                                    }
                                                                                    value={String(
                                                                                        minutes,
                                                                                    )}
                                                                                >
                                                                                    {
                                                                                        minutes
                                                                                    }{' '}
                                                                                    menit
                                                                                    setelah
                                                                                    sesi
                                                                                    dimulai
                                                                                </SelectItem>
                                                                            ),
                                                                        )}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        ) : (
                                                            <div className="grid gap-3">
                                                                <div className="grid gap-1.5">
                                                                    <Label
                                                                        htmlFor={`open-${klass.id}`}
                                                                        className="text-xs font-bold"
                                                                    >
                                                                        Waktu
                                                                        Buka
                                                                    </Label>
                                                                    <Input
                                                                        id={`open-${klass.id}`}
                                                                        name={`${prefix}[open_at]`}
                                                                        type="datetime-local"
                                                                        value={
                                                                            target.openAt
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            update(
                                                                                klass.id,
                                                                                {
                                                                                    openAt: event
                                                                                        .target
                                                                                        .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        className="h-11"
                                                                    />
                                                                </div>
                                                                <div className="grid gap-1.5">
                                                                    <Label
                                                                        htmlFor={`due-${klass.id}`}
                                                                        className="text-xs font-bold"
                                                                    >
                                                                        Batas
                                                                        Pengumpulan
                                                                    </Label>
                                                                    <Input
                                                                        id={`due-${klass.id}`}
                                                                        name={`${prefix}[due_at]`}
                                                                        type="datetime-local"
                                                                        value={
                                                                            target.dueAt
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            update(
                                                                                klass.id,
                                                                                {
                                                                                    dueAt: event
                                                                                        .target
                                                                                        .value,
                                                                                },
                                                                            )
                                                                        }
                                                                        className="h-11"
                                                                        aria-invalid={
                                                                            !!error
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                        <InputError
                                                            message={error}
                                                        />
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                    {included.length > 1 && !readOnly && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-fit"
                                            onClick={() => {
                                                const source =
                                                    targets[included[0].id];
                                                setTargets((current) =>
                                                    Object.fromEntries(
                                                        Object.entries(
                                                            current,
                                                        ).map(
                                                            ([id, target]) => [
                                                                id,
                                                                target.included
                                                                    ? {
                                                                          ...target,
                                                                          openAt: source.openAt,
                                                                          dueAt: source.dueAt,
                                                                          withSession:
                                                                              source.withSession,
                                                                          windowMinutes:
                                                                              source.windowMinutes,
                                                                      }
                                                                    : target,
                                                            ],
                                                        ),
                                                    ),
                                                );
                                            }}
                                        >
                                            <Copy /> Samakan waktu dengan{' '}
                                            {included[0].label}
                                        </Button>
                                    )}
                                    <div className="grid gap-3 border-t pt-4">
                                        <label className="flex items-start gap-2.5 text-xs leading-relaxed">
                                            <Checkbox
                                                checked={!allowLate}
                                                onCheckedChange={(checked) =>
                                                    setAllowLate(
                                                        checked !== true,
                                                    )
                                                }
                                                className="mt-0.5 size-5"
                                            />
                                            <span>
                                                <strong className="text-primary-700">
                                                    Kunci form otomatis
                                                </strong>{' '}
                                                saat batas waktu berakhir (tolak
                                                pengumpulan terlambat).
                                            </span>
                                        </label>
                                        {allowLate && (
                                            <div className="grid gap-2 pl-7">
                                                <p className="text-xs text-muted-foreground">
                                                    Pengumpulan terlambat
                                                    diterima, dengan penalti
                                                    opsional:
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <Input
                                                        aria-label="Penalti (%)"
                                                        name="late_penalty"
                                                        type="number"
                                                        step="0.5"
                                                        min={0}
                                                        max={100}
                                                        defaultValue={
                                                            task?.latePenalty ??
                                                            ''
                                                        }
                                                        placeholder="0"
                                                        className="w-20"
                                                    />
                                                    <span className="text-sm">
                                                        % per
                                                    </span>
                                                    <Select
                                                        name="late_penalty_unit"
                                                        defaultValue={
                                                            task?.latePenaltyUnit ??
                                                            'hour'
                                                        }
                                                    >
                                                        <SelectTrigger
                                                            aria-label="Satuan penalti"
                                                            className="w-24"
                                                        >
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="hour">
                                                                jam
                                                            </SelectItem>
                                                            <SelectItem value="day">
                                                                hari
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <InputError
                                                    message={
                                                        errors.late_penalty ??
                                                        errors.late_penalty_unit
                                                    }
                                                />
                                            </div>
                                        )}
                                    </div>
                                </Card>

                                <Card
                                    icon={Star}
                                    title="Penilaian & Pengumpulan"
                                >
                                    <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                                        <Label
                                            htmlFor="task-max"
                                            className="text-xs font-bold"
                                        >
                                            Poin Maksimal
                                        </Label>
                                        <div className="flex h-11 items-center border bg-white focus-within:ring-[3px] focus-within:ring-ring/25">
                                            <input
                                                id="task-max"
                                                name="max_score"
                                                type="number"
                                                min={1}
                                                max={1000}
                                                required
                                                defaultValue={
                                                    task?.maxScore ?? 100
                                                }
                                                className="h-full w-24 bg-transparent px-3 text-right text-lg font-bold outline-none"
                                            />
                                            <span className="pr-3 text-xs text-muted-foreground">
                                                Poin
                                            </span>
                                        </div>
                                    </div>
                                    <InputError message={errors.max_score} />
                                    <fieldset className="grid gap-2 border-t pt-4">
                                        <legend className="mb-2 text-xs font-bold">
                                            Format File Diterima
                                        </legend>
                                        <div className="flex flex-wrap gap-x-5 gap-y-2">
                                            {(['pdf', 'zip'] as const).map(
                                                (format) => (
                                                    <label
                                                        key={format}
                                                        className="flex items-center gap-2 text-sm"
                                                    >
                                                        <Checkbox
                                                            name="allowed_formats[]"
                                                            value={format}
                                                            defaultChecked={
                                                                task
                                                                    ? task.allowedFormats.includes(
                                                                          format,
                                                                      )
                                                                    : format ===
                                                                      'pdf'
                                                            }
                                                        />
                                                        {format === 'pdf'
                                                            ? 'PDF (≤ 10 MB)'
                                                            : 'ZIP kode (≤ 20 MB)'}
                                                    </label>
                                                ),
                                            )}
                                        </div>
                                        <InputError
                                            message={errors.allowed_formats}
                                        />
                                    </fieldset>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="task-text-answer"
                                            className="text-xs font-bold"
                                        >
                                            Jawaban Teks
                                        </Label>
                                        <Select
                                            name="text_answer"
                                            defaultValue={
                                                task?.textAnswer ?? 'optional'
                                            }
                                        >
                                            <SelectTrigger
                                                id="task-text-answer"
                                                className="w-full data-[size=default]:h-11"
                                            >
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    Tidak dipakai
                                                </SelectItem>
                                                <SelectItem value="optional">
                                                    Opsional
                                                </SelectItem>
                                                <SelectItem value="required">
                                                    Wajib diisi
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </Card>

                                <Card className="flex items-start gap-3 py-4">
                                    <p className="flex items-start gap-2.5 text-xs leading-relaxed">
                                        <Bell
                                            className="mt-0.5 size-4 shrink-0 text-primary-700"
                                            aria-hidden
                                        />
                                        <span>
                                            <strong className="text-primary-700">
                                                Notifikasi otomatis
                                            </strong>{' '}
                                            dikirim ke portal praktikan kelas
                                            tujuan saat tugas diterbitkan.
                                        </span>
                                    </p>
                                </Card>
                            </div>
                        </fieldset>
                    </div>

                    {/* Footer — Figma: bilah teal */}
                    <div className="flex flex-wrap items-center gap-3 bg-gradient-to-r from-primary-700 to-primary px-5 py-4 md:px-6">
                        <p className="mr-auto flex items-center gap-2 text-xs text-white/90">
                            <ShieldCheck className="size-4" aria-hidden />
                            Sistem Pengawasan Terintegrasi Lab IR
                        </p>
                        <DialogClose asChild>
                            <Button
                                type="button"
                                variant="secondary"
                                className="bg-primary-50 text-primary-700 hover:bg-white"
                            >
                                {readOnly ? 'Tutup' : 'Batal'}
                            </Button>
                        </DialogClose>
                        {!readOnly && !published && (
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={processing}
                                onClick={() =>
                                    intent.current &&
                                    (intent.current.value = 'draft')
                                }
                                className="border-2 border-white bg-transparent text-white hover:bg-white/10 hover:text-white"
                            >
                                {processing ? <Spinner /> : <Save />} Simpan
                                sebagai Draft
                            </Button>
                        )}
                        {!readOnly && (
                            <Button
                                type="submit"
                                disabled={processing}
                                onClick={() =>
                                    intent.current &&
                                    (intent.current.value = 'publish')
                                }
                                className="bg-white text-primary-700 hover:bg-primary-50"
                            >
                                {processing ? <Spinner /> : <Send />}{' '}
                                {published
                                    ? 'Simpan Perubahan'
                                    : `Publikasikan ${label}`}
                            </Button>
                        )}
                    </div>
                </>
            )}
        </Form>
    );
}

function AttachmentCard({
    name,
    meta,
    href,
    onRemove,
}: {
    name: string;
    meta: string;
    href?: string;
    onRemove?: () => void;
}) {
    return (
        <li className="flex items-center gap-3 border bg-white px-3 py-2.5">
            <FileText
                className="size-5 shrink-0 text-primary-700"
                aria-hidden
            />
            <span className="min-w-0 flex-1">
                {href ? (
                    <a
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-sm font-bold hover:underline"
                    >
                        {name}
                    </a>
                ) : (
                    <span className="block truncate text-sm font-bold">
                        {name}
                    </span>
                )}
                <span className="block text-xs text-muted-foreground">
                    {meta}
                </span>
            </span>
            {onRemove && (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-danger"
                    onClick={onRemove}
                    aria-label={`Hapus ${name}`}
                >
                    <X />
                </Button>
            )}
        </li>
    );
}
