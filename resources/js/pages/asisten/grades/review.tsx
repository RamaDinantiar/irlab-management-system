import { Head, Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    ChevronLeft,
    ChevronRight,
    Download,
    Save,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import GradeController from '@/actions/App/Http/Controllers/Asisten/GradeController';
import { CodeViewer } from '@/components/grading/code-viewer';
import { PdfViewer } from '@/components/grading/pdf-viewer';
import InputError from '@/components/input-error';
import { Markdown } from '@/components/markdown';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
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

/**
 * FR-AG-04 / US-A02-4: Split-Screen 70:30 — dokumen kiri, nilai kanan;
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
    const documentPanel = !current?.submission ? (
        <p className="p-6 text-sm text-muted-foreground">
            Belum ada submission.
        </p>
    ) : file?.mime === 'application/pdf' ? (
        <PdfViewer url={file.url} />
    ) : file?.mime === 'application/zip' && zipEntries ? (
        <CodeViewer submissionId={current.submission.id} entries={zipEntries} />
    ) : (
        <div className="h-full overflow-auto bg-white p-6">
            {current.submission.textAnswer ? (
                <Markdown>{current.submission.textAnswer}</Markdown>
            ) : (
                <p className="text-sm text-muted-foreground">
                    Tidak ada dokumen.
                </p>
            )}
        </div>
    );

    return (
        <>
            <Head title={`Tinjauan · ${target.title}`} />
            <div className="flex h-[calc(100svh-4rem)] flex-col">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
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
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
                        >
                            <ArrowLeft className="size-4" aria-hidden /> Tabel
                        </Link>
                        <p className="truncate text-sm">
                            <strong>{target.title}</strong> · {target.className}{' '}
                            · {TASK_TYPE_LABEL[target.type]}
                        </p>
                    </div>
                    {position && (
                        <div className="flex items-center gap-1">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => go(position.prev)}
                                disabled={!position.prev}
                                aria-label="Praktikan sebelumnya (K)"
                            >
                                <ChevronLeft /> K
                            </Button>
                            <select
                                aria-label="Pilih praktikan"
                                value={current?.userId}
                                onChange={(event) =>
                                    go(Number(event.target.value))
                                }
                                className="h-8 max-w-56 border border-input bg-white px-2 text-sm"
                            >
                                {students.map((student, i) => (
                                    <option
                                        key={student.userId}
                                        value={student.userId}
                                    >
                                        {i + 1}. {student.name}{' '}
                                        {student.graded !== null
                                            ? `· ${student.graded}`
                                            : ''}
                                    </option>
                                ))}
                            </select>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => go(position.next)}
                                disabled={!position.next}
                                aria-label="Praktikan berikutnya (J)"
                            >
                                J <ChevronRight />
                            </Button>
                        </div>
                    )}
                </div>

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
                            'min-w-0 flex-col bg-muted lg:flex',
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
                        className="hidden w-1.5 cursor-col-resize bg-primary-200 hover:bg-primary focus-visible:bg-primary focus-visible:outline-none lg:block"
                    />
                    <aside
                        aria-label="Form nilai"
                        className={cn(
                            'min-w-0 flex-col overflow-y-auto bg-white lg:flex',
                            tab === 'grade' ? 'flex w-full' : 'hidden',
                        )}
                        style={{ flexBasis: `${100 - split}%` }}
                    >
                        {current && (
                            <div className="grid gap-4 p-5">
                                <div>
                                    <p className="font-mono text-sm font-bold text-primary-700">
                                        {current.nim}
                                    </p>
                                    <p className="text-h3 font-bold">
                                        {current.name}
                                    </p>
                                    {position && (
                                        <p className="font-mono text-xs text-muted-foreground">
                                            {position.index + 1} dari{' '}
                                            {position.total} submission
                                        </p>
                                    )}
                                </div>
                                {current.submission && (
                                    <div className="flex flex-wrap items-center gap-2">
                                        <StatusBadge
                                            status={
                                                current.submission.isLate
                                                    ? 'late'
                                                    : 'submitted'
                                            }
                                            label={
                                                current.submission.lateLabel ??
                                                undefined
                                            }
                                        />
                                        <Badge variant="outline">
                                            Versi {current.submission.version}
                                        </Badge>
                                        {current.grade?.status ===
                                            'published' && (
                                            <Badge variant="success">
                                                Dipublikasikan
                                            </Badge>
                                        )}
                                        {file && (
                                            <a
                                                href={file.url.replace(
                                                    'inline=1',
                                                    '',
                                                )}
                                                className="inline-flex items-center gap-1 text-xs text-primary-700 underline"
                                            >
                                                <Download
                                                    className="size-3.5"
                                                    aria-hidden
                                                />{' '}
                                                Unduh
                                            </a>
                                        )}
                                    </div>
                                )}
                                {current.submission?.textAnswer && file && (
                                    <details className="border bg-primary-50/50 p-3 text-sm">
                                        <summary className="cursor-pointer font-medium">
                                            Jawaban teks
                                        </summary>
                                        <Markdown className="mt-2">
                                            {current.submission.textAnswer}
                                        </Markdown>
                                    </details>
                                )}
                                <div className="grid gap-2">
                                    <Label htmlFor="review-score">
                                        Nilai (0–{target.maxScore})
                                    </Label>
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
                                        className="h-12 w-32 text-center font-mono text-xl font-bold"
                                        aria-invalid={!!error}
                                        disabled={!target.canEdit}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="review-feedback">
                                        Feedback
                                    </Label>
                                    <Textarea
                                        id="review-feedback"
                                        value={feedback}
                                        onChange={(event) =>
                                            setFeedback(event.target.value)
                                        }
                                        rows={10}
                                        className="font-mono text-sm"
                                        placeholder={
                                            'Catatan untuk praktikan. Blok kode:\n```python\n...\n```'
                                        }
                                        disabled={!target.canEdit}
                                    />
                                </div>
                                <InputError message={error ?? undefined} />
                                {target.canEdit && (
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => save(false)}
                                            disabled={
                                                saving || !current.submission
                                            }
                                        >
                                            {saving ? <Spinner /> : <Save />}{' '}
                                            Simpan
                                        </Button>
                                        <Button
                                            onClick={() => save(true)}
                                            disabled={
                                                saving || !current.submission
                                            }
                                        >
                                            {saving && <Spinner />} Simpan &
                                            Lanjut <ChevronRight />
                                        </Button>
                                    </div>
                                )}
                                <p className="text-xs text-muted-foreground">
                                    Nilai tersimpan sebagai Draft. Publikasikan
                                    dari halaman tabel.
                                </p>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}
