import { Form, Head, Link, router } from '@inertiajs/react';
import {
    CheckCheck,
    Columns2,
    Download,
    ExternalLink,
    FileText,
    Search,
    Send,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import GradeController from '@/actions/App/Http/Controllers/Asisten/GradeController';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { TASK_TYPE_LABEL, TASK_TYPE_SLUG } from '@/lib/task';
import { cn } from '@/lib/utils';
import type { FileLink, SelectOption, TaskType } from '@/types';

export type GradeRow = {
    userId: number;
    nim: string | null;
    name: string;
    submission: {
        id: number;
        submittedAt: string;
        isLate: boolean;
        lateLabel: string | null;
        version: number;
        textAnswer: string | null;
        file: FileLink | null;
    } | null;
    grade: {
        score: number | null;
        feedback: string | null;
        status: 'draft' | 'published';
        version: number;
        grader: string | null;
    } | null;
};

export type GradeTarget = {
    id: number;
    classId: number;
    className: string;
    title: string;
    type: TaskType;
    maxScore: number;
    dueAt: string | null;
    submitted: number;
    graded: number;
    drafts: number;
    members: number;
    canEdit: boolean;
};

type Draft = { score: string; feedback: string };

const stamp = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
});

/**
 * Asisten › Grade (US-A02, FR-AG-01…06) — Figma "Grade Post Test / Pre-Test".
 */
export default function GradesIndex({
    type,
    classes,
    targets,
    selected,
    target,
    rows,
}: {
    type: TaskType | null;
    classes: SelectOption[];
    targets: {
        id: number;
        label: string;
        type: TaskType;
        submitted: number;
        graded: number;
    }[];
    selected: { classId: number | null; targetId: number | null };
    target: GradeTarget | null;
    rows: GradeRow[];
}) {
    const [drafts, setDrafts] = useState<Record<number, Draft>>({});
    const [errors, setErrors] = useState<Record<number, string>>({});
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const dirtyIds = Object.keys(drafts).map(Number);
    const dirty = dirtyIds.length > 0;
    const inputs = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(
        new Map(),
    );

    // Reset saat berpindah tugas.
    useEffect(() => {
        setDrafts({});
        setErrors({});
    }, [target?.id]);

    // US-A02-6: peringatan meninggalkan halaman dengan perubahan belum tersimpan.
    useEffect(() => {
        if (!dirty) {
            return;
        }

        const beforeUnload = (event: BeforeUnloadEvent) =>
            event.preventDefault();
        window.addEventListener('beforeunload', beforeUnload);
        const off = router.on('before', (event) => {
            if (
                event.detail.visit.method === 'get' &&
                !window.confirm(
                    'Ada nilai yang belum disimpan. Tinggalkan halaman ini?',
                )
            ) {
                event.preventDefault();
            }
        });

        return () => {
            window.removeEventListener('beforeunload', beforeUnload);
            off();
        };
    }, [dirty]);

    const visible = useMemo(() => {
        const term = search.trim().toLowerCase();

        return term
            ? rows.filter(
                  (row) =>
                      row.name.toLowerCase().includes(term) ||
                      (row.nim ?? '').includes(term),
              )
            : rows;
    }, [rows, search]);

    const navigate = (query: Record<string, number | undefined>) =>
        router.get(
            GradeController.index.url(
                type ? { type: TASK_TYPE_SLUG[type] } : undefined,
            ),
            Object.fromEntries(
                Object.entries(query).filter(
                    ([, value]) => value !== undefined,
                ),
            ) as Record<string, number>,
            { preserveScroll: true },
        );

    const value = (row: GradeRow, field: keyof Draft): string => {
        if (!row.submission) {
            return '';
        }

        const draft = drafts[row.submission.id];
        if (draft) {
            return draft[field];
        }

        return field === 'score'
            ? (row.grade?.score?.toString() ?? '')
            : (row.grade?.feedback ?? '');
    };

    const change = (row: GradeRow, field: keyof Draft, next: string) => {
        if (!row.submission) {
            return;
        }

        const id = row.submission.id;
        setDrafts((current) => ({
            ...current,
            [id]: {
                ...(current[id] ?? {
                    score: value(row, 'score'),
                    feedback: value(row, 'feedback'),
                }),
                [field]: next,
            },
        }));
        setErrors((current) => {
            const { [id]: _removed, ...rest } = current;

            return rest;
        });
    };

    const save = () => {
        if (!target) {
            return;
        }

        const ids = dirtyIds;
        const payload = ids.map((id) => {
            const row = rows.find((r) => r.submission?.id === id)!;

            return {
                submission_id: id,
                score: drafts[id].score.trim(),
                feedback: drafts[id].feedback,
                version: row.grade?.version ?? null,
            };
        });

        setSaving(true);
        router.patch(
            GradeController.batch.url(),
            { target_id: target.id, grades: payload },
            {
                preserveScroll: true,
                onSuccess: () => setDrafts({}),
                onError: (bag) =>
                    setErrors(
                        Object.fromEntries(
                            Object.entries(bag)
                                .map(([key, message]) => {
                                    const match = key.match(/^grades\.(\d+)\./);

                                    return match
                                        ? [ids[Number(match[1])], message]
                                        : null;
                                })
                                .filter(
                                    (entry): entry is [number, string] =>
                                        entry !== null,
                                ),
                        ),
                    ),
                onFinish: () => setSaving(false),
            },
        );
    };

    // FR-AG-02: Enter → sel yang sama di baris berikutnya.
    const focusNext = (index: number, field: keyof Draft) => {
        for (let i = index + 1; i < visible.length; i++) {
            const id = visible[i].submission?.id;
            const element = id
                ? inputs.current.get(`${id}-${field}`)
                : undefined;
            if (element) {
                element.focus();

                return;
            }
        }
    };

    const percent =
        target && target.submitted > 0
            ? Math.round((target.graded / target.submitted) * 1000) / 10
            : 0;

    return (
        <>
            <Head title={`Grade${type ? ` · ${TASK_TYPE_LABEL[type]}` : ''}`} />
            <div className="flex flex-col gap-6 p-4 pb-28 md:p-6 md:pb-28 lg:p-8 lg:pb-28">
                <div className="flex flex-col gap-4 border-b border-primary-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-h1 font-bold text-primary-900">
                            Grade{type && ` · ${TASK_TYPE_LABEL[type]}`}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Pusat penilaian tugas praktikum terpadu, koreksi
                            cepat, & feedback asisten lab.
                        </p>
                    </div>
                    {target && (
                        <div className="flex items-center gap-4 border bg-card px-4 py-3 shadow-sm">
                            <div className="grid min-w-56 gap-1">
                                <p className="flex justify-between gap-3 text-xs font-bold text-primary-700">
                                    <span>Progress Penilaian</span>
                                    <span className="font-mono">
                                        {target.graded}/{target.submitted}{' '}
                                        Dinilai
                                    </span>
                                </p>
                                <div
                                    role="progressbar"
                                    aria-label="Progress penilaian"
                                    aria-valuenow={target.graded}
                                    aria-valuemin={0}
                                    aria-valuemax={target.submitted}
                                    className="h-1.5 bg-primary-200"
                                >
                                    <div
                                        className="h-full bg-primary-700"
                                        style={{ width: `${percent}%` }}
                                    />
                                </div>
                            </div>
                            <span className="flex items-center gap-1.5 border-l pl-4 text-xs font-bold text-primary-700">
                                <CheckCheck className="size-4" aria-hidden />{' '}
                                {percent.toLocaleString('id-ID')}% Selesai
                            </span>
                        </div>
                    )}
                </div>

                {classes.length === 0 ? (
                    <EmptyState
                        icon={FileText}
                        title="Belum ada kelas"
                        description="Anda belum mengampu kelas pada semester aktif."
                    />
                ) : (
                    <>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="grid gap-1.5 border bg-card px-3 py-2">
                                <Label
                                    htmlFor="grade-class"
                                    className="text-xs font-normal"
                                >
                                    Pilih Kelas
                                </Label>
                                <Select
                                    value={
                                        selected.classId
                                            ? String(selected.classId)
                                            : undefined
                                    }
                                    onValueChange={(v) =>
                                        navigate({ class: Number(v) })
                                    }
                                >
                                    <SelectTrigger
                                        id="grade-class"
                                        className="h-8 border-0 px-0 font-bold"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {classes.map((option) => (
                                            <SelectItem
                                                key={option.id}
                                                value={String(option.id)}
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-1.5 border bg-card px-3 py-2">
                                <Label
                                    htmlFor="grade-task"
                                    className="text-xs font-normal"
                                >
                                    Pilih Tugas
                                </Label>
                                <Select
                                    value={
                                        selected.targetId
                                            ? String(selected.targetId)
                                            : undefined
                                    }
                                    onValueChange={(v) =>
                                        navigate({
                                            class:
                                                selected.classId ?? undefined,
                                            target: Number(v),
                                        })
                                    }
                                    disabled={targets.length === 0}
                                >
                                    <SelectTrigger
                                        id="grade-task"
                                        className="h-8 border-0 px-0 font-bold"
                                    >
                                        <SelectValue placeholder="Belum ada tugas terbit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {targets.map((option) => (
                                            <SelectItem
                                                key={option.id}
                                                value={String(option.id)}
                                            >
                                                {option.label} · {option.graded}
                                                /{option.submitted}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {target && (
                            <>
                                <div className="flex flex-col gap-3 border border-primary-200 bg-primary-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex gap-3">
                                        <span className="flex size-9 shrink-0 items-center justify-center bg-primary-700 text-white">
                                            <Columns2
                                                className="size-5"
                                                aria-hidden
                                            />
                                        </span>
                                        <div>
                                            <p className="font-bold">
                                                Mode Tinjauan Belah Layar
                                                (Split-Screen Review)
                                            </p>
                                            <p className="text-xs">
                                                Periksa dokumen (70%)
                                                berdampingan dengan form nilai &
                                                feedback (30%) tanpa berpindah
                                                tab. Navigasi J/K.
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        asChild
                                        className="shrink-0"
                                        disabled={target.submitted === 0}
                                    >
                                        <Link
                                            href={GradeController.review.url(
                                                target.id,
                                            )}
                                        >
                                            Mulai Mode Tinjauan
                                        </Link>
                                    </Button>
                                </div>

                                <section
                                    aria-labelledby="students-title"
                                    className="border bg-card"
                                >
                                    <div className="flex flex-wrap items-end justify-between gap-3 p-5">
                                        <div>
                                            <h2
                                                id="students-title"
                                                className="text-h2 font-bold text-primary-900"
                                            >
                                                List of Students
                                            </h2>
                                            <p className="text-xs">
                                                {TASK_TYPE_LABEL[target.type]} ·{' '}
                                                {target.title} · maks{' '}
                                                {target.maxScore}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="relative">
                                                <Search
                                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                                    aria-hidden
                                                />
                                                <Input
                                                    type="search"
                                                    value={search}
                                                    onChange={(event) =>
                                                        setSearch(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Cari berdasarkan NIM atau Nama…"
                                                    aria-label="Cari praktikan"
                                                    className="w-64 pl-9"
                                                />
                                            </div>
                                            <Button variant="outline" asChild>
                                                <a
                                                    href={GradeController.export.url(
                                                        target.classId,
                                                    )}
                                                >
                                                    <Download /> Export Excel
                                                </a>
                                            </Button>
                                            {target.canEdit && (
                                                <Form
                                                    {...GradeController.publish.form(
                                                        target.id,
                                                    )}
                                                    options={{
                                                        preserveScroll: true,
                                                    }}
                                                >
                                                    {({ processing }) => (
                                                        <Button
                                                            type="submit"
                                                            variant="secondary"
                                                            disabled={
                                                                processing ||
                                                                dirty ||
                                                                target.drafts ===
                                                                    0
                                                            }
                                                            title={
                                                                dirty
                                                                    ? 'Simpan perubahan terlebih dahulu'
                                                                    : undefined
                                                            }
                                                        >
                                                            {processing ? (
                                                                <Spinner />
                                                            ) : (
                                                                <Send />
                                                            )}{' '}
                                                            Publikasikan (
                                                            {target.drafts})
                                                        </Button>
                                                    )}
                                                </Form>
                                            )}
                                        </div>
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>NIM</TableHead>
                                                <TableHead>
                                                    Nama Praktikan
                                                </TableHead>
                                                <TableHead>
                                                    Status Pengumpulan
                                                </TableHead>
                                                <TableHead>
                                                    Lampiran Tugas
                                                </TableHead>
                                                <TableHead className="w-28">
                                                    Input Nilai
                                                </TableHead>
                                                <TableHead className="min-w-56">
                                                    Catatan/Feedback
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {visible.map((row, index) => {
                                                const id = row.submission?.id;
                                                const isDirty =
                                                    id !== undefined &&
                                                    drafts[id] !== undefined;
                                                const error =
                                                    id !== undefined
                                                        ? errors[id]
                                                        : undefined;

                                                return (
                                                    <TableRow
                                                        key={row.userId}
                                                        data-dirty={isDirty}
                                                        className={cn(
                                                            error &&
                                                                'bg-danger-soft/60',
                                                        )}
                                                    >
                                                        <TableCell className="font-mono font-bold text-primary-700">
                                                            {row.nim}
                                                        </TableCell>
                                                        <TableCell className="whitespace-normal">
                                                            <span className="block">
                                                                {row.name}
                                                            </span>
                                                            {row.grade
                                                                ?.status ===
                                                                'published' && (
                                                                <Badge
                                                                    variant="success"
                                                                    className="mt-1"
                                                                >
                                                                    Dipublikasikan
                                                                </Badge>
                                                            )}
                                                            {row.grade
                                                                ?.grader && (
                                                                <span className="block text-[11px] text-muted-foreground">
                                                                    oleh{' '}
                                                                    {
                                                                        row
                                                                            .grade
                                                                            .grader
                                                                    }
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="whitespace-normal">
                                                            {row.submission ? (
                                                                <>
                                                                    <span className="block text-sm">
                                                                        {stamp.format(
                                                                            new Date(
                                                                                row
                                                                                    .submission
                                                                                    .submittedAt,
                                                                            ),
                                                                        )}{' '}
                                                                        WIB
                                                                    </span>
                                                                    <StatusBadge
                                                                        status={
                                                                            row
                                                                                .submission
                                                                                .isLate
                                                                                ? 'late'
                                                                                : 'submitted'
                                                                        }
                                                                        label={
                                                                            row
                                                                                .submission
                                                                                .lateLabel ??
                                                                            undefined
                                                                        }
                                                                        className="mt-1"
                                                                    />
                                                                </>
                                                            ) : (
                                                                <StatusBadge status="not_submitted" />
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {row.submission
                                                                ?.file ? (
                                                                <a
                                                                    href={
                                                                        row
                                                                            .submission
                                                                            .file
                                                                            .url
                                                                    }
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex max-w-52 items-center gap-1.5 bg-primary-50 px-2.5 py-1.5 text-sm text-primary-700 hover:underline"
                                                                >
                                                                    <FileText
                                                                        className="size-4 shrink-0 text-danger"
                                                                        aria-hidden
                                                                    />
                                                                    <span className="truncate">
                                                                        {
                                                                            row
                                                                                .submission
                                                                                .file
                                                                                .name
                                                                        }
                                                                    </span>
                                                                    <ExternalLink
                                                                        className="size-3.5 shrink-0"
                                                                        aria-hidden
                                                                    />
                                                                </a>
                                                            ) : row.submission
                                                                  ?.textAnswer ? (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Jawaban teks
                                                                </span>
                                                            ) : null}
                                                        </TableCell>
                                                        <TableCell>
                                                            {row.submission && (
                                                                <Input
                                                                    ref={(
                                                                        el,
                                                                    ) => {
                                                                        if (el)
                                                                            inputs.current.set(
                                                                                `${id}-score`,
                                                                                el,
                                                                            );
                                                                    }}
                                                                    inputMode="decimal"
                                                                    value={value(
                                                                        row,
                                                                        'score',
                                                                    )}
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        change(
                                                                            row,
                                                                            'score',
                                                                            event.target.value.replace(
                                                                                ',',
                                                                                '.',
                                                                            ),
                                                                        )
                                                                    }
                                                                    onKeyDown={(
                                                                        event,
                                                                    ) => {
                                                                        if (
                                                                            event.key ===
                                                                            'Enter'
                                                                        ) {
                                                                            event.preventDefault();
                                                                            focusNext(
                                                                                index,
                                                                                'score',
                                                                            );
                                                                        }
                                                                    }}
                                                                    placeholder={`0 - ${target.maxScore}`}
                                                                    aria-label={`Nilai ${row.name}`}
                                                                    aria-invalid={
                                                                        !!error
                                                                    }
                                                                    disabled={
                                                                        !target.canEdit
                                                                    }
                                                                    className="w-20 text-center font-mono"
                                                                />
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="whitespace-normal">
                                                            {row.submission && (
                                                                <>
                                                                    <Textarea
                                                                        ref={(
                                                                            el,
                                                                        ) => {
                                                                            if (
                                                                                el
                                                                            )
                                                                                inputs.current.set(
                                                                                    `${id}-feedback`,
                                                                                    el,
                                                                                );
                                                                        }}
                                                                        value={value(
                                                                            row,
                                                                            'feedback',
                                                                        )}
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            change(
                                                                                row,
                                                                                'feedback',
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        rows={1}
                                                                        aria-label={`Feedback ${row.name}`}
                                                                        disabled={
                                                                            !target.canEdit
                                                                        }
                                                                        className="field-sizing-content min-h-9 resize-none py-1.5 text-sm focus:min-h-20"
                                                                    />
                                                                    <InputError
                                                                        message={
                                                                            error
                                                                        }
                                                                        className="mt-1 text-xs"
                                                                    />
                                                                </>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </section>
                            </>
                        )}
                        {!target && (
                            <EmptyState
                                icon={FileText}
                                title="Belum ada tugas terbit"
                                description="Tugas yang sudah dibuka untuk kelas ini akan muncul di sini."
                            />
                        )}
                    </>
                )}
            </div>

            {/* Figma: bar gelap "N Nilai Belum Disimpan" — Simpan Batch (FR-AG-03). */}
            {dirty && (
                <div
                    role="region"
                    aria-label="Perubahan belum disimpan"
                    className="fixed right-4 bottom-4 z-30 flex flex-wrap items-center gap-4 bg-primary-900 px-5 py-3 text-white shadow-xl md:right-8"
                >
                    <div>
                        <p className="font-mono text-sm font-bold">
                            {dirtyIds.length} Nilai Belum Disimpan
                        </p>
                        <p className="text-xs text-white/80">
                            Nilai tersimpan sebagai Draft sampai dipublikasikan.
                        </p>
                    </div>
                    <span className="h-8 w-px bg-white/30" aria-hidden />
                    <Button
                        variant="ghost"
                        className="text-white hover:bg-white/10 hover:text-white"
                        onClick={() => setDrafts({})}
                        disabled={saving}
                    >
                        Batal
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={save}
                        disabled={saving}
                    >
                        {saving && <Spinner />} Simpan Seluruh Nilai (
                        {dirtyIds.length})
                    </Button>
                </div>
            )}
        </>
    );
}
