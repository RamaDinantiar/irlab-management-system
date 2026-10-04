import { Head, Link } from '@inertiajs/react';
import {
    BookOpenCheck,
    Clock,
    GraduationCap,
    MessageSquareText,
} from 'lucide-react';
import { useState } from 'react';
import GradeController from '@/actions/App/Http/Controllers/Praktikan/GradeController';
import { EmptyState } from '@/components/empty-state';
import { Markdown } from '@/components/markdown';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDate, formatRelative } from '@/lib/datetime';
import { formatSchedule } from '@/lib/days';
import { cn } from '@/lib/utils';

type Cell = {
    taskTitle: string;
    maxScore: number;
    score: number | null;
    status: 'graded' | 'awaiting_grade' | 'not_submitted' | 'open';
    feedback: string | null;
    grader: string | null;
    gradedAt: string | null;
    isLate: boolean;
} | null;

type Course = {
    classId: number;
    course: string;
    className: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    assistants: string;
    final: number | null;
    letter: string | null;
};

type Detail = {
    classId: number;
    course: string;
    className: string;
    weights: { pretest: number; posttest: number; report: number };
    final: {
        pretest: number | null;
        posttest: number | null;
        report: number | null;
        final: number | null;
        letter: string | null;
    };
    attendance: { present: number; total: number };
    rows: {
        meeting: number;
        title: string | null;
        date: string;
        pretest: Cell;
        posttest: Cell;
        report: Cell;
    }[];
    others: Cell[];
};

const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });

function ScoreCell({
    cell,
    onFeedback,
}: {
    cell: Cell;
    onFeedback: (cell: NonNullable<Cell>) => void;
}) {
    if (!cell) {
        return <span className="text-muted-foreground">–</span>;
    }

    if (cell.score === null) {
        return (
            <span className="text-xs text-muted-foreground">
                {cell.status === 'awaiting_grade'
                    ? 'Menunggu'
                    : cell.status === 'open'
                      ? 'Terbuka'
                      : '–'}
            </span>
        );
    }

    return (
        <button
            type="button"
            onClick={() => onFeedback(cell)}
            className="bg-primary-50 px-2.5 py-1.5 font-mono text-sm font-bold whitespace-nowrap text-primary-700 hover:bg-primary-100 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
            aria-label={`${cell.taskTitle}: ${cell.score} dari ${cell.maxScore}. Lihat feedback`}
        >
            {number.format(cell.score)} / {cell.maxScore}
        </button>
    );
}

/** Praktikan › Grade (FR-PG, US-P03) — read-only. */
export default function PraktikanGrades({
    courses,
    detail,
}: {
    courses: Course[];
    detail: Detail | null;
}) {
    const [open, setOpen] = useState<NonNullable<Cell> | null>(null);

    const rowAverage = (row: Detail['rows'][number]) => {
        const values = [row.pretest, row.posttest, row.report]
            .filter((c): c is NonNullable<Cell> => !!c && c.score !== null)
            .map((c) => (c.score! / c.maxScore) * 100);

        return values.length
            ? values.reduce((a, b) => a + b, 0) / values.length
            : null;
    };

    const rowStatus = (row: Detail['rows'][number]) => {
        const cells = [row.pretest, row.posttest, row.report].filter(
            (c): c is NonNullable<Cell> => !!c,
        );
        if (cells.some((c) => c.status === 'awaiting_grade'))
            return 'awaiting_grade' as const;
        if (cells.length > 0 && cells.every((c) => c.status === 'graded'))
            return 'verified_grade' as const;

        return null;
    };

    const latestFeedback = (row: Detail['rows'][number]) =>
        [row.report, row.posttest, row.pretest].find((c) => c?.feedback);

    return (
        <>
            <Head title="Penilaian (Grade)" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <div className="space-y-1 border-b border-primary-200 pb-5">
                    <h1 className="text-h1 font-bold text-primary-900">
                        Penilaian (Grade)
                    </h1>
                    <p className="max-w-2xl text-sm text-muted-foreground">
                        Rekapitulasi capaian nilai modul, pre-test, post-test,
                        laporan, dan umpan balik asisten laboratorium. Nilai
                        muncul setelah dipublikasikan asisten.
                    </p>
                </div>

                {courses.length === 0 ? (
                    <EmptyState
                        icon={GraduationCap}
                        title="Belum ada mata kuliah"
                        description="Gabung kelas praktikum terlebih dahulu."
                    />
                ) : (
                    <>
                        <section
                            aria-labelledby="courses-title"
                            className="grid gap-3"
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h2
                                    id="courses-title"
                                    className="flex items-center gap-2 font-bold"
                                >
                                    <GraduationCap
                                        className="size-5 text-primary-700"
                                        aria-hidden
                                    />{' '}
                                    Mata Kuliah Praktikum Terdaftar
                                </h2>
                                <span className="text-xs font-bold">
                                    {courses.length} Mata Kuliah Diambil
                                </span>
                            </div>
                            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {courses.map((course) => {
                                    const active =
                                        course.classId === detail?.classId;

                                    return (
                                        <li key={course.classId}>
                                            <Link
                                                href={GradeController.index.url(
                                                    {
                                                        query: {
                                                            class: course.classId,
                                                        },
                                                    },
                                                )}
                                                preserveScroll
                                                aria-current={
                                                    active ? 'true' : undefined
                                                }
                                                className={cn(
                                                    'grid gap-2 border bg-card p-4 transition-colors hover:bg-primary-50/40 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                                                    active &&
                                                        'border-2 border-primary-700',
                                                )}
                                            >
                                                <span className="flex items-center justify-between">
                                                    <Badge
                                                        variant={
                                                            active
                                                                ? 'default'
                                                                : 'muted'
                                                        }
                                                    >
                                                        {course.className}
                                                    </Badge>
                                                    <span className="font-mono text-h3 font-bold">
                                                        {course.final === null
                                                            ? '–'
                                                            : `${number.format(course.final)} / ${course.letter}`}
                                                    </span>
                                                </span>
                                                <span className="text-h3 font-bold">
                                                    {course.course}
                                                </span>
                                                <span className="flex items-center gap-1 font-mono text-xs">
                                                    <Clock
                                                        className="size-3.5"
                                                        aria-hidden
                                                    />{' '}
                                                    {formatSchedule(
                                                        course.dayOfWeek,
                                                        course.startTime,
                                                        course.endTime,
                                                    )}{' '}
                                                    WIB
                                                </span>
                                                <span className="border-t pt-2 text-xs">
                                                    Asisten:{' '}
                                                    {course.assistants || '—'}
                                                </span>
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>

                        {detail && (
                            <>
                                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                    <StatCard
                                        label="Nilai Akhir Kumulatif"
                                        value={
                                            detail.final.final === null
                                                ? '–'
                                                : number.format(
                                                      detail.final.final,
                                                  )
                                        }
                                        suffix="/100"
                                        footer={
                                            detail.final.letter && (
                                                <Badge variant="success">
                                                    Grade: {detail.final.letter}
                                                </Badge>
                                            )
                                        }
                                    />
                                    <StatCard
                                        label="Rata-rata Pre-Test"
                                        value={
                                            detail.final.pretest === null
                                                ? '–'
                                                : number.format(
                                                      detail.final.pretest,
                                                  )
                                        }
                                        suffix="/100"
                                        footer={`Bobot ${detail.weights.pretest}%`}
                                    />
                                    <StatCard
                                        label="Rata-rata Post-Test"
                                        value={
                                            detail.final.posttest === null
                                                ? '–'
                                                : number.format(
                                                      detail.final.posttest,
                                                  )
                                        }
                                        suffix="/100"
                                        footer={`Bobot ${detail.weights.posttest}%`}
                                    />
                                    <StatCard
                                        label="Kehadiran Praktikum"
                                        value={
                                            detail.attendance.total
                                                ? `${Math.round((detail.attendance.present / detail.attendance.total) * 100)}%`
                                                : '–'
                                        }
                                        suffix={`${detail.attendance.present}/${detail.attendance.total} Hadir`}
                                        footer={`Rata-rata laporan ${detail.final.report === null ? '–' : number.format(detail.final.report)} · bobot ${detail.weights.report}%`}
                                    />
                                </div>
                                <p className="-mt-2 text-xs text-muted-foreground">
                                    Nilai akhir sementara = rata-rata berbobot
                                    komponen yang sudah dinilai (Pre-test{' '}
                                    {detail.weights.pretest}%, Post-test{' '}
                                    {detail.weights.posttest}%, Laporan{' '}
                                    {detail.weights.report}%).
                                </p>

                                <section
                                    aria-labelledby="table-title"
                                    className="border bg-card"
                                >
                                    <div className="p-5">
                                        <h2
                                            id="table-title"
                                            className="text-h2 font-bold text-primary-900"
                                        >
                                            Daftar Penilaian Per Pertemuan
                                            Praktikum
                                        </h2>
                                        <p className="text-xs">
                                            Rincian skor Pre-Test, Post-Test,
                                            Laporan, verifikasi asisten, dan
                                            umpan balik tugas.
                                        </p>
                                    </div>
                                    {detail.rows.length === 0 ? (
                                        <p className="px-5 pb-5 text-sm text-muted-foreground">
                                            Belum ada tugas yang dibuka.
                                        </p>
                                    ) : (
                                        <>
                                            <div className="hidden md:block">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>
                                                                Pertemuan &
                                                                Materi Praktikum
                                                            </TableHead>
                                                            <TableHead>
                                                                Waktu
                                                            </TableHead>
                                                            <TableHead>
                                                                Pre-Test
                                                            </TableHead>
                                                            <TableHead>
                                                                Post-Test
                                                            </TableHead>
                                                            <TableHead>
                                                                Laporan
                                                            </TableHead>
                                                            <TableHead>
                                                                Rata-rata
                                                            </TableHead>
                                                            <TableHead>
                                                                Status Nilai
                                                            </TableHead>
                                                            <TableHead className="min-w-56">
                                                                Catatan/Feedback
                                                            </TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {detail.rows.map(
                                                            (row) => {
                                                                const average =
                                                                    rowAverage(
                                                                        row,
                                                                    );
                                                                const status =
                                                                    rowStatus(
                                                                        row,
                                                                    );
                                                                const feedback =
                                                                    latestFeedback(
                                                                        row,
                                                                    );

                                                                return (
                                                                    <TableRow
                                                                        key={
                                                                            row.meeting
                                                                        }
                                                                    >
                                                                        <TableCell className="max-w-48 whitespace-normal">
                                                                            <span className="block font-bold text-primary-700">
                                                                                Pertemuan{' '}
                                                                                {String(
                                                                                    row.meeting,
                                                                                ).padStart(
                                                                                    2,
                                                                                    '0',
                                                                                )}
                                                                                :
                                                                            </span>
                                                                            <span className="text-sm">
                                                                                {
                                                                                    row.title
                                                                                }
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell className="text-sm whitespace-nowrap">
                                                                            {formatDate(
                                                                                row.date,
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <ScoreCell
                                                                                cell={
                                                                                    row.pretest
                                                                                }
                                                                                onFeedback={
                                                                                    setOpen
                                                                                }
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <ScoreCell
                                                                                cell={
                                                                                    row.posttest
                                                                                }
                                                                                onFeedback={
                                                                                    setOpen
                                                                                }
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <ScoreCell
                                                                                cell={
                                                                                    row.report
                                                                                }
                                                                                onFeedback={
                                                                                    setOpen
                                                                                }
                                                                            />
                                                                        </TableCell>
                                                                        <TableCell className="font-mono font-bold">
                                                                            {average ===
                                                                            null
                                                                                ? '–'
                                                                                : number.format(
                                                                                      average,
                                                                                  )}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {status ===
                                                                                'verified_grade' && (
                                                                                <StatusBadge status="verified_grade" />
                                                                            )}
                                                                            {status ===
                                                                                'awaiting_grade' && (
                                                                                <StatusBadge
                                                                                    status="awaiting_grade"
                                                                                    label="Belum Dinilai Asisten"
                                                                                />
                                                                            )}
                                                                        </TableCell>
                                                                        <TableCell className="max-w-56 min-w-44 whitespace-normal">
                                                                            {feedback ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() =>
                                                                                        setOpen(
                                                                                            feedback,
                                                                                        )
                                                                                    }
                                                                                    className="text-left text-xs hover:underline"
                                                                                >
                                                                                    <span className="line-clamp-3">
                                                                                        “
                                                                                        {
                                                                                            feedback.feedback
                                                                                        }
                                                                                        ”
                                                                                    </span>
                                                                                    <span className="mt-1 block font-bold text-primary-700">
                                                                                        Asisten:{' '}
                                                                                        {
                                                                                            feedback.grader
                                                                                        }
                                                                                    </span>
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-muted-foreground">
                                                                                    –
                                                                                </span>
                                                                            )}
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            },
                                                        )}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            {/* FR-PG-04: mobile → daftar kartu */}
                                            <ul className="grid gap-3 px-4 pb-4 md:hidden">
                                                {detail.rows.map((row) => (
                                                    <li
                                                        key={row.meeting}
                                                        className="grid gap-2 border p-3"
                                                    >
                                                        <p className="font-bold text-primary-700">
                                                            P
                                                            {String(
                                                                row.meeting,
                                                            ).padStart(
                                                                2,
                                                                '0',
                                                            )}{' '}
                                                            · {row.title}
                                                        </p>
                                                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                                            {(
                                                                [
                                                                    'pretest',
                                                                    'posttest',
                                                                    'report',
                                                                ] as const
                                                            ).map((key) => (
                                                                <div
                                                                    key={key}
                                                                    className="grid gap-1"
                                                                >
                                                                    <span className="text-muted-foreground">
                                                                        {key ===
                                                                        'pretest'
                                                                            ? 'Pre'
                                                                            : key ===
                                                                                'posttest'
                                                                              ? 'Post'
                                                                              : 'Laporan'}
                                                                    </span>
                                                                    <ScoreCell
                                                                        cell={
                                                                            row[
                                                                                key
                                                                            ]
                                                                        }
                                                                        onFeedback={
                                                                            setOpen
                                                                        }
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}
                                </section>
                            </>
                        )}
                    </>
                )}
            </div>

            {/* US-P03-2: pop-up feedback lengkap, termasuk blok kode. */}
            <Dialog
                open={open !== null}
                onOpenChange={(value) => !value && setOpen(null)}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MessageSquareText
                                className="size-5 text-primary-700"
                                aria-hidden
                            />{' '}
                            {open?.taskTitle}
                        </DialogTitle>
                        <DialogDescription>
                            Nilai{' '}
                            <strong className="font-mono">
                                {open?.score !== null && open
                                    ? number.format(open.score)
                                    : '–'}{' '}
                                / {open?.maxScore}
                            </strong>
                            {open?.grader && ` · dinilai ${open.grader}`}
                            {open?.gradedAt &&
                                ` · ${formatRelative(open.gradedAt)}`}
                        </DialogDescription>
                    </DialogHeader>
                    {open?.feedback ? (
                        <Markdown className="max-h-[60vh] overflow-y-auto text-sm">
                            {open.feedback}
                        </Markdown>
                    ) : (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <BookOpenCheck className="size-4" aria-hidden />{' '}
                            Tidak ada catatan dari asisten.
                        </p>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
