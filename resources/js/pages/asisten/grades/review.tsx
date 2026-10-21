import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    Download,
    MessageSquareText,
    UserRound,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import GradeController from '@/actions/App/Http/Controllers/Asisten/GradeController';
import { CodeViewer } from '@/components/grading/code-viewer';
import { DocumentToolbar, PdfViewer } from '@/components/grading/pdf-viewer';
import InputError from '@/components/input-error';
import { Markdown } from '@/components/markdown';
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
import { Textarea } from '@/components/ui/textarea';
import { useInitials } from '@/hooks/use-initials';
import { formatFileSize } from '@/lib/files';
import { TASK_TYPE_LABEL, TASK_TYPE_SLUG } from '@/lib/task';
import { cn } from '@/lib/utils';
import type { GradeRow, GradeTarget } from './index';

type Student = {
    userId: number;
    name: string;
    nim: string | null;
    graded: number | null;
};
type Position = {
    index: number;
    total: number;
    prev: number | null;
    next: number | null;
};
type ZipEntry = { path: string; size: number; viewable: boolean };

const MIN = 50;
const MAX = 80;

/** Huruf mutu dari persentase — sama dengan App\Support\Grading\FinalScore::letter. */
const GRADE_SCALE: [number, string][] = [
    [85, 'A'],
    [80, 'AB'],
    [70, 'B'],
    [65, 'BC'],
    [55, 'C'],
    [40, 'D'],
];

function gradeLetter(percent: number): string {
    return GRADE_SCALE.find(([min]) => percent >= min)?.[1] ?? 'E';
}

/**
 * FR-AG-04 / US-A02-4: Split-Screen 70:30 — dokumen kiri, nilai kanan
 * (Figma "SPLIT SCREEN REVIEW"; satu nilai per submission, bukan rubrik per soal);
 * panel dapat di-resize (50:50 … 80:20); J/K berpindah praktikan;
 * < 1024 px menjadi tab "Dokumen" & "Nilai".
 */
export default function GradeReview({
    target,
    students,
    current,
    position,
    zipEntries,
}: {
    target: GradeTarget;
    students: Student[];
    current: GradeRow | null;
    position: Position | null;
    zipEntries: ZipEntry[] | null;
}) {
    const [split, setSplit] = useState(70);
    const [tab, setTab] = useState<'doc' | 'grade'>('doc');
    const [score, setScore] = useState(current?.grade?.score?.toString() ?? '');
    const [feedback, setFeedback] = useState(current?.grade?.feedback ?? '');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const container = useRef<HTMLDivElement>(null);
    const getInitials = useInitials();
    const dirty =
        score !== (current?.grade?.score?.toString() ?? '') ||
        feedback !== (current?.grade?.feedback ?? '');

    useEffect(() => {
        setScore(current?.grade?.score?.toString() ?? '');
        setFeedback(current?.grade?.feedback ?? '');
        setError(null);
    }, [current?.userId, current?.grade?.version]);

    const go = useCallback(
        (userId: number | null | undefined) => {
            if (!userId) {
                return;
            }

            if (
                dirty &&
                !window.confirm(
                    'Nilai praktikan ini belum disimpan. Pindah tanpa menyimpan?',
                )
            ) {
                return;
            }

            router.get(
                GradeController.review.url(target.id, {
                    query: { student: userId },
                }),
                {},
                { preserveScroll: false },
            );
        },
        [dirty, target.id],
    );

    const save = (andNext: boolean) => {
        if (!current?.submission) {
            return;
        }

        setSaving(true);
        router.patch(
            GradeController.batch.url(),
            {
                target_id: target.id,
                grades: [
                    {
                        submission_id: current.submission.id,
                        score: score.trim(),
                        feedback,
                        version: current.grade?.version ?? null,
                    },
                ],
            },
            {
                preserveScroll: true,
                onSuccess: () =>
                    andNext &&
                    position?.next &&
                    router.get(
                        GradeController.review.url(target.id, {
                            query: { student: position.next },
                        }),
                    ),
                onError: (bag) =>
                    setError(Object.values(bag)[0] ?? 'Gagal menyimpan.'),
                onFinish: () => setSaving(false),
            },
        );
    };

    // Shortcut J/K (tidak aktif saat mengetik).
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            const element = event.target as HTMLElement;
            if (
                ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName) ||
                element.isContentEditable ||
                event.metaKey ||
                event.ctrlKey
            ) {
                return;
            }

            if (event.key === 'j' || event.key === 'J') {
                go(position?.next);
            } else if (event.key === 'k' || event.key === 'K') {
                go(position?.prev);
            }
        };
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, [go, position]);

    const startResize = (event: React.PointerEvent) => {
        event.preventDefault();
        const move = (e: PointerEvent) => {
            const rect = container.current?.getBoundingClientRect();
            if (rect) {
                setSplit(
                    Math.min(
                        MAX,
                        Math.max(
                            MIN,
                            ((e.clientX - rect.left) / rect.width) * 100,
                        ),
                    ),
                );
            }
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    const file = current?.submission?.file;
    const downloadUrl = file?.url.replace('inline=1', '');
    const typeLabel = TASK_TYPE_LABEL[target.type];
    const numeric = score.trim() === '' ? null : Number(score);
    const valid =
        numeric !== null &&
        !Number.isNaN(numeric) &&
        numeric >= 0 &&
        numeric <= target.maxScore;
    const percent = valid ? (numeric / target.maxScore) * 100 : 0;

    const documentPanel = !current?.submission ? (
        <p className="p-6 text-sm text-muted-foreground">
            Belum ada submission.
        </p>
    ) : file?.mime === 'application/pdf' ? (
        <PdfViewer
            url={file.url}
            fileName={file.name}
            downloadUrl={downloadUrl}
        />
    ) : file?.mime === 'application/zip' && zipEntries ? (
        <div className="flex h-full flex-col">
            <DocumentToolbar fileName={file.name}>
                <Button asChild size="sm" variant="outline">
                    <a href={downloadUrl} download>
                        <Download /> Unduh
                    </a>
                </Button>
            </DocumentToolbar>
            <div className="min-h-0 flex-1">
                <CodeViewer
                    submissionId={current.submission.id}
                    entries={zipEntries}
                />
            </div>
        </div>
    ) : (
        <div className="flex h-full flex-col bg-[#cde7ee]">
            <DocumentToolbar fileName={file?.name ?? 'Jawaban teks'} />
            <div className="flex-1 overflow-auto px-8 py-10">
                <article className="mx-auto max-w-3xl bg-white p-8 shadow-md">
                    {current.submission.textAnswer ? (
                        <Markdown>{current.submission.textAnswer}</Markdown>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Tidak ada dokumen.
                        </p>
                    )}
                </article>
            </div>
        </div>
    );

    return (
        <>
            <Head title={`Tinjauan · ${target.title}`} />
            <div className="flex h-[calc(100svh-4rem)] flex-col">
                <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b bg-white px-4 py-3 md:px-6">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2">
                        <Link
                            href={GradeController.index.url(
                                { type: TASK_TYPE_SLUG[target.type] },
                                {
                                    query: {
                                        class: target.classId,
                                        target: target.id,
                                    },
                                },
                            )}
                            className="inline-flex shrink-0 items-center gap-2 font-medium text-primary-700 hover:underline"
                        >
                            <ArrowLeft className="size-5" aria-hidden /> Keluar
                            dari Mode Tinjauan
                        </Link>
                        <span
                            aria-hidden
                            className="hidden h-8 w-px bg-input md:block"
                        />
                        <nav aria-label="Konteks penilaian" className="min-w-0">
                            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm md:text-base">
                                <li className="font-medium">
                                    Penilaian {typeLabel}
                                </li>
                                <li aria-hidden>
                                    <ChevronRight className="size-4" />
                                </li>
                                <li className="font-medium">
                                    {target.course} ({target.className})
                                </li>
                                {target.meetingNumber && (
                                    <>
                                        <li aria-hidden>
                                            <ChevronRight className="size-4" />
                                        </li>
                                        <li className="font-medium text-primary-600">
                                            Pertemuan ke-{target.meetingNumber}
                                        </li>
                                    </>
                                )}
                            </ol>
                        </nav>
                    </div>
                    {position && (
                        <div className="flex items-center bg-primary-50">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-10 text-primary-700"
                                onClick={() => go(position.prev)}
                                disabled={!position.prev}
                                aria-label="Praktikan sebelumnya (K)"
                                title="Praktikan sebelumnya (K)"
                            >
                                <ChevronLeft />
                            </Button>
                            <Select
                                value={String(current?.userId ?? '')}
                                onValueChange={(v) => go(Number(v))}
                            >
                                <SelectTrigger
                                    aria-label="Pilih praktikan"
                                    className="h-10 border-0 bg-transparent font-bold text-primary-700 shadow-none hover:bg-primary-100 data-[size=default]:h-10 [&>svg:last-child]:hidden"
                                >
                                    <SelectValue>
                                        <UserRound
                                            className="size-5 text-primary-700"
                                            aria-hidden
                                        />
                                        Praktikan {position.index + 1} dari{' '}
                                        {position.total}
                                    </SelectValue>
                                </SelectTrigger>
                                <SelectContent align="end">
                                    {students.map((student, i) => (
                                        <SelectItem
                                            key={student.userId}
                                            value={String(student.userId)}
                                        >
                                            {i + 1}. {student.name}
                                            {student.graded !== null &&
                                                ` · ${student.graded}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-10 text-primary-700"
                                onClick={() => go(position.next)}
                                disabled={!position.next}
                                aria-label="Praktikan berikutnya (J)"
                                title="Praktikan berikutnya (J)"
                            >
                                <ChevronRight />
                            </Button>
                        </div>
                    )}
                </header>

                {/* < 1024 px: tab */}
                <div
                    role="tablist"
                    aria-label="Panel"
                    className="flex border-b bg-white lg:hidden"
                >
                    {(['doc', 'grade'] as const).map((value) => (
                        <button
                            key={value}
                            role="tab"
                            aria-selected={tab === value}
                            onClick={() => setTab(value)}
                            className={cn(
                                'flex-1 border-b-2 py-2 text-sm',
                                tab === value
                                    ? 'border-primary-700 font-bold text-primary-700'
                                    : 'border-transparent',
                            )}
                        >
                            {value === 'doc' ? 'Dokumen' : 'Nilai'}
                        </button>
                    ))}
                </div>

                <div ref={container} className="flex min-h-0 flex-1">
                    <section
                        aria-label="Dokumen submission"
                        className={cn(
                            'min-w-0 flex-col bg-[#cde7ee] lg:flex',
                            tab === 'doc' ? 'flex w-full' : 'hidden',
                        )}
                        style={{ flexBasis: `${split}%` }}
                    >
                        {documentPanel}
                    </section>
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Ubah lebar panel"
                        aria-valuenow={Math.round(split)}
                        aria-valuemin={MIN}
                        aria-valuemax={MAX}
                        tabIndex={0}
                        onPointerDown={startResize}
                        onKeyDown={(event) => {
                            if (event.key === 'ArrowLeft')
                                setSplit((s) => Math.max(MIN, s - 5));
                            if (event.key === 'ArrowRight')
                                setSplit((s) => Math.min(MAX, s + 5));
                        }}
                        className="hidden w-1 cursor-col-resize bg-primary-200 hover:bg-primary focus-visible:bg-primary focus-visible:outline-none lg:block"
                    />
                    <aside
                        aria-labelledby="grade-form-title"
                        className={cn(
                            'min-w-0 flex-col bg-primary-50 lg:flex lg:min-w-[24rem]',
                            tab === 'grade' ? 'flex w-full' : 'hidden',
                        )}
                        style={{ flexBasis: `${100 - split}%` }}
                    >
                        <h2
                            id="grade-form-title"
                            className="flex min-h-14 items-center gap-3 border-b bg-white px-5 text-lg font-bold"
                        >
                            <ClipboardCheck
                                className="size-6 text-primary-700"
                                aria-hidden
                            />
                            Form Penilaian &amp; Feedback
                        </h2>
                        {current && (
                            <>
                                <div className="grid flex-1 content-start gap-4 overflow-y-auto p-5">
                                    <div className="flex items-center gap-4 border bg-white p-4">
                                        <span
                                            aria-hidden
                                            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-700 text-lg font-bold text-white"
                                        >
                                            {getInitials(current.name)}
                                        </span>
                                        <div className="grid min-w-0 gap-0.5">
                                            <p className="truncate font-bold">
                                                {current.name}
                                            </p>
                                            <p className="text-sm">
                                                NIM: {current.nim ?? '—'}
                                            </p>
                                            {file && (
                                                <a
                                                    href={downloadUrl}
                                                    className="truncate text-xs text-primary-700 hover:underline"
                                                >
                                                    {file.name} (
                                                    {formatFileSize(file.size)})
                                                </a>
                                            )}
                                            {current.submission && (
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                                    <StatusBadge
                                                        status={
                                                            current.submission
                                                                .isLate
                                                                ? 'late'
                                                                : 'submitted'
                                                        }
                                                        label={
                                                            current.submission
                                                                .lateLabel ??
                                                            undefined
                                                        }
                                                    />
                                                    <Badge variant="outline">
                                                        Versi{' '}
                                                        {
                                                            current.submission
                                                                .version
                                                        }
                                                    </Badge>
                                                    {current.grade?.status ===
                                                        'published' && (
                                                        <Badge variant="success">
                                                            Dipublikasikan
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {current.submission?.textAnswer && file && (
                                        <details className="border bg-white p-4 text-sm">
                                            <summary className="cursor-pointer font-medium">
                                                Jawaban teks praktikan
                                            </summary>
                                            <Markdown className="mt-2">
                                                {current.submission.textAnswer}
                                            </Markdown>
                                        </details>
                                    )}

                                    <div className="grid gap-2">
                                        <p className="font-medium text-muted-foreground">
                                            Penilaian
                                        </p>
                                        <div className="grid gap-3 border bg-white p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <Label
                                                        htmlFor="review-score"
                                                        className="font-bold"
                                                    >
                                                        Nilai {typeLabel}
                                                    </Label>
                                                    <p className="text-sm text-muted-foreground">
                                                        Skor 0–{target.maxScore}
                                                    </p>
                                                </div>
                                                <div className="flex items-end gap-1">
                                                    <Input
                                                        id="review-score"
                                                        inputMode="decimal"
                                                        value={score}
                                                        onChange={(event) =>
                                                            setScore(
                                                                event.target.value.replace(
                                                                    ',',
                                                                    '.',
                                                                ),
                                                            )
                                                        }
                                                        className="h-12 w-20 text-center text-lg font-bold"
                                                        aria-invalid={
                                                            !!error ||
                                                            (numeric !== null &&
                                                                !valid)
                                                        }
                                                        aria-describedby="review-score-max"
                                                        disabled={
                                                            !target.canEdit
                                                        }
                                                    />
                                                    <span
                                                        id="review-score-max"
                                                        className="pb-1 text-muted-foreground"
                                                    >
                                                        / {target.maxScore}
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                aria-hidden
                                                className="h-1.5 rounded-full bg-primary-100"
                                            >
                                                <div
                                                    className="h-full rounded-full bg-primary-700 transition-[width]"
                                                    style={{
                                                        width: `${percent}%`,
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-4 border bg-linear-to-r from-white to-primary-100 p-4">
                                        <div>
                                            <p className="font-medium">
                                                Total Skor Akhir
                                            </p>
                                            <p className="flex items-baseline gap-1">
                                                <span className="text-[2rem] leading-none font-bold">
                                                    {valid ? numeric : '—'}
                                                </span>
                                                <span className="text-sm">
                                                    /{target.maxScore}
                                                </span>
                                            </p>
                                        </div>
                                        {valid && (
                                            <span className="bg-success-soft px-2.5 py-1 text-sm font-bold text-success">
                                                Grade {gradeLetter(percent)}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        <div className="grid gap-0.5">
                                            <Label
                                                htmlFor="review-feedback"
                                                className="flex items-center gap-2 font-bold"
                                            >
                                                <MessageSquareText
                                                    className="size-4 text-primary-700"
                                                    aria-hidden
                                                />
                                                Catatan dan Feedback
                                            </Label>
                                            <p
                                                id="review-feedback-hint"
                                                className="text-xs text-muted-foreground"
                                            >
                                                Dapat dilihat oleh praktikan.
                                            </p>
                                        </div>
                                        <Textarea
                                            id="review-feedback"
                                            aria-describedby="review-feedback-hint"
                                            value={feedback}
                                            onChange={(event) =>
                                                setFeedback(event.target.value)
                                            }
                                            rows={6}
                                            className="bg-white text-sm"
                                            placeholder="Catatan untuk praktikan"
                                            disabled={!target.canEdit}
                                        />
                                    </div>
                                    <InputError message={error ?? undefined} />
                                </div>

                                {target.canEdit && (
                                    <div className="grid min-w-0 gap-2 border-t bg-white p-4">
                                        <Button
                                            size="lg"
                                            className="h-auto min-h-11 py-2 whitespace-normal"
                                            onClick={() => save(true)}
                                            disabled={
                                                saving || !current.submission
                                            }
                                        >
                                            {saving && <Spinner />}
                                            {position?.next
                                                ? 'Simpan & Lanjut Praktikan Berikutnya'
                                                : 'Simpan Nilai'}
                                            <ArrowRight />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => save(false)}
                                            disabled={
                                                saving || !current.submission
                                            }
                                        >
                                            Simpan Draft
                                        </Button>
                                        <p className="text-center text-xs text-muted-foreground">
                                            Nilai tersimpan sebagai Draft.
                                            Publikasikan dari halaman tabel.
                                        </p>
                                    </div>
                                )}
                            </>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}
