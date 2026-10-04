import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Copy, FileText, Paperclip, Save, Send } from 'lucide-react';
import { useRef, useState } from 'react';
import TaskController from '@/actions/App/Http/Controllers/Asisten/TaskController';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { RichTextEditor } from '@/components/rich-text/rich-text-editor';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { TASK_TYPE_LABEL, TASK_TYPE_SLUG, toLocalInput } from '@/lib/task';
import { cn } from '@/lib/utils';
import type { TaskFormData, TaskFormOptions, TaskType } from '@/types';

type TargetDraft = {
    included: boolean;
    openAt: string;
    dueAt: string;
    withSession: boolean;
    windowMinutes: string;
};

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="grid gap-5 border bg-card p-5 md:p-6">
            <div>
                <h2 className="text-h3 font-bold text-primary-700">{title}</h2>
                {description && (
                    <p className="text-sm text-muted-foreground">
                        {description}
                    </p>
                )}
            </div>
            {children}
        </section>
    );
}

/**
 * Asisten › Task Management: buat/ubah tugas (FR-AT-01…05).
 */
export default function TaskForm({
    task,
    defaultType,
    courses,
    limits,
}: { task: TaskFormData | null; defaultType: TaskType } & TaskFormOptions) {
    const [type, setType] = useState<TaskType>(task?.type ?? defaultType);
    const [courseId, setCourseId] = useState<number | null>(
        task?.courseId ?? courses[0]?.id ?? null,
    );
    const [allowLate, setAllowLate] = useState(task?.allowLate ?? false);
    const intent = useRef<HTMLInputElement>(null);
    const course = courses.find((option) => option.id === courseId);

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
                            windowMinutes: String(saved?.windowMinutes ?? 15),
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
    const firstIncluded = course?.classes.find(
        (klass) => targets[klass.id]?.included,
    );

    const readOnly = task !== null && !task.canEdit;
    let targetIndex = 0;

    return (
        <>
            <Head title={task ? `Ubah ${task.title}` : 'Buat Tugas'} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <Link
                    href={TaskController.index.url({
                        type: TASK_TYPE_SLUG[type],
                    })}
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
                >
                    <ArrowLeft className="size-4" aria-hidden /> Daftar tugas
                </Link>
                <PageHeader
                    title={task ? 'Ubah Tugas' : 'Buat Tugas'}
                    description="Soal, lampiran, pengaturan pengumpulan, dan tenggat per kelas. Praktikan hanya melihat tugas yang sudah terbit pada waktu bukanya."
                    actions={
                        task && (
                            <StatusBadge
                                status={
                                    task.status === 'published'
                                        ? 'open'
                                        : 'draft'
                                }
                                label={
                                    task.status === 'published'
                                        ? 'Terbit'
                                        : 'Draft'
                                }
                            />
                        )
                    }
                />

                {courses.length === 0 ? (
                    <p className="border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning">
                        Anda belum mengampu mata kuliah yang disetujui pada
                        semester aktif.
                    </p>
                ) : (
                    <Form
                        {...(task
                            ? TaskController.update.form(task.id)
                            : TaskController.store.form())}
                        options={{ preserveScroll: true }}
                        className="grid gap-6"
                    >
                        {({ processing, errors }) => (
                            <>
                                <input
                                    ref={intent}
                                    type="hidden"
                                    name="intent"
                                    defaultValue="draft"
                                />
                                <fieldset
                                    disabled={readOnly}
                                    className="grid gap-6"
                                >
                                    <Section title="Soal">
                                        {!task && (
                                            <div className="grid gap-5 md:grid-cols-[auto_1fr]">
                                                <div className="grid gap-2">
                                                    <span
                                                        className="text-sm font-medium"
                                                        id="type-label"
                                                    >
                                                        Jenis tugas
                                                    </span>
                                                    <div
                                                        role="radiogroup"
                                                        aria-labelledby="type-label"
                                                        className="flex"
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
                                                                    type ===
                                                                        value
                                                                        ? 'border-primary-700 bg-primary-700 text-white'
                                                                        : 'bg-white hover:bg-primary-50',
                                                                )}
                                                            >
                                                                <input
                                                                    type="radio"
                                                                    name="type"
                                                                    value={
                                                                        value
                                                                    }
                                                                    checked={
                                                                        type ===
                                                                        value
                                                                    }
                                                                    onChange={() =>
                                                                        setType(
                                                                            value,
                                                                        )
                                                                    }
                                                                    className="sr-only"
                                                                />
                                                                {
                                                                    TASK_TYPE_LABEL[
                                                                        value
                                                                    ]
                                                                }
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label htmlFor="task-course">
                                                        Mata kuliah
                                                    </Label>
                                                    <Select
                                                        name="course_id"
                                                        value={
                                                            courseId
                                                                ? String(
                                                                      courseId,
                                                                  )
                                                                : undefined
                                                        }
                                                        onValueChange={(
                                                            value,
                                                        ) => {
                                                            setCourseId(
                                                                Number(value),
                                                            );
                                                            setTargets(
                                                                initialTargets(
                                                                    Number(
                                                                        value,
                                                                    ),
                                                                ),
                                                            );
                                                        }}
                                                    >
                                                        <SelectTrigger
                                                            id="task-course"
                                                            className="w-full"
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
                                                    <InputError
                                                        message={
                                                            errors.course_id
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        {task && (
                                            <p className="text-sm">
                                                <strong>
                                                    {TASK_TYPE_LABEL[task.type]}
                                                </strong>{' '}
                                                · {course?.label}
                                            </p>
                                        )}
                                        <div className="grid gap-5 md:grid-cols-[1fr_10rem]">
                                            <div className="grid gap-2">
                                                <Label htmlFor="task-title">
                                                    Judul
                                                </Label>
                                                <Input
                                                    id="task-title"
                                                    name="title"
                                                    required
                                                    maxLength={150}
                                                    defaultValue={task?.title}
                                                    placeholder={`${TASK_TYPE_LABEL[type]} Modul 04`}
                                                    aria-invalid={
                                                        !!errors.title
                                                    }
                                                />
                                                <InputError
                                                    message={errors.title}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="task-meeting">
                                                    Pertemuan ke-
                                                </Label>
                                                <Input
                                                    id="task-meeting"
                                                    name="meeting_number"
                                                    type="number"
                                                    min={1}
                                                    max={50}
                                                    defaultValue={
                                                        task?.meetingNumber ??
                                                        ''
                                                    }
                                                    placeholder="Opsional"
                                                />
                                                <InputError
                                                    message={
                                                        errors.meeting_number
                                                    }
                                                />
                                            </div>
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="task-body">
                                                Uraian soal
                                            </Label>
                                            <RichTextEditor
                                                id="task-body"
                                                name="body"
                                                defaultValue={task?.body}
                                                placeholder="Tulis soal, sisipkan blok kode bila perlu…"
                                                invalid={!!errors.body}
                                            />
                                            <InputError message={errors.body} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label
                                                htmlFor="task-attachments"
                                                className="flex items-center gap-1.5"
                                            >
                                                <Paperclip
                                                    className="size-4"
                                                    aria-hidden
                                                />{' '}
                                                Lampiran soal
                                            </Label>
                                            {task &&
                                                task.attachments.length > 0 && (
                                                    <ul className="grid gap-1.5">
                                                        {task.attachments.map(
                                                            (file) => (
                                                                <li
                                                                    key={
                                                                        file.id
                                                                    }
                                                                    className="flex flex-wrap items-center gap-3 text-sm"
                                                                >
                                                                    <a
                                                                        href={
                                                                            file.url
                                                                        }
                                                                        className="inline-flex items-center gap-1 text-primary-700 underline"
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                    >
                                                                        <FileText
                                                                            className="size-4"
                                                                            aria-hidden
                                                                        />{' '}
                                                                        {
                                                                            file.name
                                                                        }
                                                                    </a>
                                                                    <span className="font-mono text-xs text-muted-foreground">
                                                                        {formatFileSize(
                                                                            file.size,
                                                                        )}
                                                                    </span>
                                                                    <label className="flex items-center gap-1.5 text-xs">
                                                                        <Checkbox
                                                                            name="remove_attachments[]"
                                                                            value={String(
                                                                                file.id,
                                                                            )}
                                                                        />{' '}
                                                                        Hapus
                                                                    </label>
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                )}
                                            <Input
                                                id="task-attachments"
                                                name="attachments[]"
                                                type="file"
                                                multiple
                                                accept=".pdf,.zip,.jpg,.jpeg,.png"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                PDF, ZIP, atau gambar · maks.{' '}
                                                {limits.attachmentMb} MB per
                                                file · maks.{' '}
                                                {limits.attachments} file.
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
                                        </div>
                                    </Section>

                                    <Section
                                        title="Pengumpulan"
                                        description="FR-AT-04: aturan jawaban, keterlambatan, dan nilai maksimal."
                                    >
                                        <div className="grid gap-5 md:grid-cols-3">
                                            <div className="grid gap-2">
                                                <Label htmlFor="task-max">
                                                    Nilai maksimal
                                                </Label>
                                                <Input
                                                    id="task-max"
                                                    name="max_score"
                                                    type="number"
                                                    min={1}
                                                    max={1000}
                                                    required
                                                    defaultValue={
                                                        task?.maxScore ?? 100
                                                    }
                                                    className="w-32"
                                                />
                                                <InputError
                                                    message={errors.max_score}
                                                />
                                            </div>
                                            <fieldset className="grid gap-2">
                                                <legend className="mb-2 text-sm font-medium">
                                                    Format file diterima
                                                </legend>
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
                                                                : 'ZIP berisi kode (≤ 20 MB)'}
                                                        </label>
                                                    ),
                                                )}
                                                <InputError
                                                    message={
                                                        errors.allowed_formats
                                                    }
                                                />
                                            </fieldset>
                                            <fieldset className="grid gap-2">
                                                <legend className="mb-2 text-sm font-medium">
                                                    Jawaban teks
                                                </legend>
                                                {(
                                                    [
                                                        [
                                                            'none',
                                                            'Tidak dipakai',
                                                        ],
                                                        [
                                                            'optional',
                                                            'Opsional',
                                                        ],
                                                        ['required', 'Wajib'],
                                                    ] as const
                                                ).map(([value, label]) => (
                                                    <label
                                                        key={value}
                                                        className="flex items-center gap-2 text-sm"
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="text_answer"
                                                            value={value}
                                                            defaultChecked={
                                                                (task?.textAnswer ??
                                                                    'optional') ===
                                                                value
                                                            }
                                                            className="accent-primary"
                                                        />
                                                        {label}
                                                    </label>
                                                ))}
                                            </fieldset>
                                        </div>
                                        <div className="grid gap-3">
                                            <label className="flex items-center gap-2 text-sm font-medium">
                                                <Checkbox
                                                    name="allow_late"
                                                    value="1"
                                                    checked={allowLate}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        setAllowLate(
                                                            checked === true,
                                                        )
                                                    }
                                                />
                                                Izinkan pengumpulan terlambat
                                            </label>
                                            {allowLate && (
                                                <div className="flex flex-wrap items-end gap-3 pl-6">
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="task-penalty">
                                                            Penalti (%)
                                                        </Label>
                                                        <Input
                                                            id="task-penalty"
                                                            name="late_penalty"
                                                            type="number"
                                                            step="0.5"
                                                            min={0}
                                                            max={100}
                                                            defaultValue={
                                                                task?.latePenalty ??
                                                                ''
                                                            }
                                                            placeholder="Opsional"
                                                            className="w-32"
                                                        />
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label htmlFor="task-penalty-unit">
                                                            per
                                                        </Label>
                                                        <Select
                                                            name="late_penalty_unit"
                                                            defaultValue={
                                                                task?.latePenaltyUnit ??
                                                                'hour'
                                                            }
                                                        >
                                                            <SelectTrigger
                                                                id="task-penalty-unit"
                                                                className="w-28"
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
                                    </Section>

                                    <Section
                                        title="Kelas & Tenggat"
                                        description="FR-AT-03: satu tugas untuk beberapa kelas, tenggat berbeda per kelas."
                                    >
                                        {!course ||
                                        course.classes.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">
                                                Mata kuliah ini belum memiliki
                                                kelas yang Anda ampu.
                                            </p>
                                        ) : (
                                            <ul className="grid gap-3">
                                                {course.classes.map((klass) => {
                                                    const target =
                                                        targets[klass.id];
                                                    const index =
                                                        target?.included
                                                            ? targetIndex++
                                                            : -1;
                                                    const prefix = `targets[${index}]`;

                                                    return (
                                                        <li
                                                            key={klass.id}
                                                            className={cn(
                                                                'grid gap-3 border p-4',
                                                                target?.included
                                                                    ? 'bg-white'
                                                                    : 'bg-muted/50',
                                                            )}
                                                        >
                                                            <label className="flex flex-wrap items-center gap-2 font-medium">
                                                                <Checkbox
                                                                    checked={
                                                                        target?.included
                                                                    }
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
                                                                />
                                                                {klass.label}
                                                                <span className="font-mono text-xs text-muted-foreground">
                                                                    {formatSchedule(
                                                                        klass.dayOfWeek,
                                                                        klass.startTime,
                                                                        klass.endTime,
                                                                    )}
                                                                </span>
                                                            </label>
                                                            {target?.included && (
                                                                <div className="grid gap-3 pl-6">
                                                                    <input
                                                                        type="hidden"
                                                                        name={`${prefix}[class_id]`}
                                                                        value={
                                                                            klass.id
                                                                        }
                                                                    />
                                                                    {type ===
                                                                        'pretest' && (
                                                                        <label className="flex items-center gap-2 text-sm">
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
                                                                            />
                                                                            Buka
                                                                            otomatis
                                                                            saat
                                                                            sesi
                                                                            pertemuan
                                                                            dimulai
                                                                            (FR-PT-06)
                                                                        </label>
                                                                    )}
                                                                    {type ===
                                                                        'pretest' &&
                                                                    target.withSession ? (
                                                                        <div className="flex items-center gap-2 text-sm">
                                                                            <Label
                                                                                htmlFor={`window-${klass.id}`}
                                                                            >
                                                                                Durasi
                                                                            </Label>
                                                                            <Input
                                                                                id={`window-${klass.id}`}
                                                                                name={`${prefix}[window_minutes]`}
                                                                                type="number"
                                                                                min={
                                                                                    5
                                                                                }
                                                                                max={
                                                                                    240
                                                                                }
                                                                                value={
                                                                                    target.windowMinutes
                                                                                }
                                                                                onChange={(
                                                                                    event,
                                                                                ) =>
                                                                                    update(
                                                                                        klass.id,
                                                                                        {
                                                                                            windowMinutes:
                                                                                                event
                                                                                                    .target
                                                                                                    .value,
                                                                                        },
                                                                                    )
                                                                                }
                                                                                className="w-24"
                                                                            />
                                                                            menit
                                                                            pertama
                                                                            sesi
                                                                        </div>
                                                                    ) : (
                                                                        <div className="grid gap-3 sm:grid-cols-2">
                                                                            <div className="grid gap-1.5">
                                                                                <Label
                                                                                    htmlFor={`open-${klass.id}`}
                                                                                    className="text-xs"
                                                                                >
                                                                                    Dibuka
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
                                                                                />
                                                                            </div>
                                                                            <div className="grid gap-1.5">
                                                                                <Label
                                                                                    htmlFor={`due-${klass.id}`}
                                                                                    className="text-xs"
                                                                                >
                                                                                    Tenggat
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
                                                                                    aria-invalid={
                                                                                        !!errors[
                                                                                            `targets.${index}.due_at`
                                                                                        ]
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    <InputError
                                                                        message={
                                                                            errors[
                                                                                `targets.${index}.due_at`
                                                                            ] ??
                                                                            errors[
                                                                                `targets.${index}.class_id`
                                                                            ]
                                                                        }
                                                                    />
                                                                </div>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                        {firstIncluded &&
                                            course &&
                                            course.classes.filter(
                                                (klass) =>
                                                    targets[klass.id]?.included,
                                            ).length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="w-fit"
                                                    onClick={() => {
                                                        const source =
                                                            targets[
                                                                firstIncluded.id
                                                            ];
                                                        setTargets((current) =>
                                                            Object.fromEntries(
                                                                Object.entries(
                                                                    current,
                                                                ).map(
                                                                    ([
                                                                        id,
                                                                        target,
                                                                    ]) => [
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
                                                    <Copy /> Samakan waktu
                                                    dengan {firstIncluded.label}
                                                </Button>
                                            )}
                                        <InputError message={errors.targets} />
                                    </Section>
                                </fieldset>

                                {!readOnly && (
                                    <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap justify-end gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:-mx-8 lg:px-8">
                                        {task?.status !== 'published' && (
                                            <Button
                                                type="submit"
                                                variant="outline"
                                                disabled={processing}
                                                onClick={() =>
                                                    intent.current &&
                                                    (intent.current.value =
                                                        'draft')
                                                }
                                            >
                                                {processing ? (
                                                    <Spinner />
                                                ) : (
                                                    <Save />
                                                )}{' '}
                                                Simpan Draft
                                            </Button>
                                        )}
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                            onClick={() =>
                                                intent.current &&
                                                (intent.current.value =
                                                    'publish')
                                            }
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <Send />
                                            )}{' '}
                                            {task?.status === 'published'
                                                ? 'Simpan Perubahan'
                                                : 'Terbitkan'}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </Form>
                )}
            </div>
        </>
    );
}
