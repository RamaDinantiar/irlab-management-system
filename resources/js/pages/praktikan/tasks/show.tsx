import { Form, Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    CheckCircle2,
    Download,
    FileText,
    Info,
    Paperclip,
} from 'lucide-react';
import { useState } from 'react';
import TaskController from '@/actions/App/Http/Controllers/Praktikan/TaskController';
import InputError from '@/components/input-error';
import { Markdown } from '@/components/markdown';
import { PageHeader } from '@/components/page-header';
import { RichTextViewer } from '@/components/rich-text/rich-text-viewer';
import { StatusBadge } from '@/components/status-badge';
import { AnswerDropzone } from '@/components/tasks/answer-dropzone';
import { TaskDeadlineBanner } from '@/components/tasks/task-deadline-banner';
import { Badge } from '@/components/ui/badge';
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
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useNow } from '@/hooks/use-now';
import { formatSchedule } from '@/lib/days';
import { formatFileSize } from '@/lib/files';
import { TASK_TYPE_LABEL } from '@/lib/task';
import { cn } from '@/lib/utils';
import type { FileLink, StudentTask } from '@/types';
import type { JSONContent } from '@tiptap/react';

type TaskDetail = StudentTask & {
    body: JSONContent | null;
    attachments: FileLink[];
    maxScore: number;
    allowLate: boolean;
    latePenalty: number | null;
    latePenaltyUnit: 'hour' | 'day' | null;
    allowedFormats: ('pdf' | 'zip')[];
    textAnswer: 'none' | 'optional' | 'required';
    meeting: { number: number; title: string | null } | null;
    schedule: {
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        room: string | null;
    };
    assistants: string[];
    limits: { pdf: number; zip: number };
};

type Version = {
    id: number;
    version: number;
    isCurrent: boolean;
    submittedAt: string;
    isLate: boolean;
    lateLabel: string | null;
    receiptNumber: string | null;
    textAnswer: string | null;
    file: FileLink | null;
    sha256: string | null;
};

const timestamp = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Jakarta',
});

/** Praktikan › Task › detail & pengumpulan (FR-PT-02…05, US-P02). */
export default function PraktikanTaskShow({
    task,
    history,
}: {
    task: TaskDetail;
    history: Version[];
}) {
    const now = useNow(30_000);
    const [confirming, setConfirming] = useState(false);
    const [dropzoneKey, setDropzoneKey] = useState(0);
    const typeLabel = TASK_TYPE_LABEL[task.type];
    const current = history.find((version) => version.isCurrent);
    const pastDue = task.dueAt !== null && new Date(task.dueAt).getTime() < now;
    const canSubmit = task.state === 'open' && !(current && pastDue);

    return (
        <>
            <Head title={task.title} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <Link
                    href={TaskController.index.url()}
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
                >
                    <ArrowLeft className="size-4" aria-hidden /> Semua tugas
                </Link>
                <PageHeader
                    title={task.title}
                    description={`${typeLabel} · ${task.course} · ${task.className}${task.meeting ? ` · Pertemuan ${task.meeting.number}` : ''}`}
                    actions={
                        <StatusBadge
                            status={task.status}
                            label={
                                task.status === 'not_submitted'
                                    ? 'Belum'
                                    : undefined
                            }
                        />
                    }
                />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
                    <section
                        aria-labelledby="course-title"
                        className="grid content-start gap-3"
                    >
                        <h2 id="course-title" className="text-h2 font-medium">
                            Matakuliah Aktif
                        </h2>
                        <div className="grid gap-1 border border-[#bfbfbf] bg-white px-4 py-3 shadow-sm">
                            <p className="text-lg font-medium">
                                {task.course} ({task.className})
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatSchedule(
                                    task.schedule.dayOfWeek,
                                    task.schedule.startTime,
                                    task.schedule.endTime,
                                )}{' '}
                                WIB
                                {task.schedule.room &&
                                    ` · ${task.schedule.room}`}
                                {task.meeting &&
                                    ` · Pertemuan ${task.meeting.number}`}
                            </p>
                        </div>
                    </section>
                    <section
                        aria-labelledby="assistants-title"
                        className="grid content-start gap-3"
                    >
                        <h2
                            id="assistants-title"
                            className="text-h2 font-medium"
                        >
                            Informasi Asisten
                        </h2>
                        <div className="border border-[#bfbfbf] bg-white px-4 py-3 shadow-sm">
                            {task.assistants.length === 0 ? (
                                <p className="py-2 text-sm text-muted-foreground">
                                    Belum ada asisten yang ditugaskan.
                                </p>
                            ) : (
                                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                                    {task.assistants.map((name, i) => (
                                        <div
                                            key={name}
                                            className="grid gap-0.5"
                                        >
                                            <dt className="text-xs font-medium text-muted-foreground">
                                                Asisten {i + 1}:
                                            </dt>
                                            <dd className="font-medium text-primary-700">
                                                {name}
                                            </dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                        </div>
                    </section>
                </div>

                <TaskDeadlineBanner
                    typeLabel={typeLabel}
                    state={task.state}
                    openAt={task.openAt}
                    dueAt={task.dueAt}
                    allowLate={task.allowLate}
                    latePenalty={task.latePenalty}
                    latePenaltyUnit={task.latePenaltyUnit}
                    maxScore={task.maxScore}
                    accepting={canSubmit}
                    submittedAt={current?.submittedAt ?? null}
                />

                <section
                    aria-labelledby="instructions-title"
                    className="grid gap-4 bg-card p-5 md:p-6"
                >
                    <h2
                        id="instructions-title"
                        className="flex items-center gap-3 border-b border-input pb-4 text-h2 font-bold"
                    >
                        <Info className="size-7 shrink-0" aria-hidden />
                        Instruksi &amp; Petunjuk Pengerjaan Mahasiswa
                    </h2>
                    {task.body ? (
                        <RichTextViewer content={task.body} />
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Tidak ada instruksi tambahan.
                        </p>
                    )}
                    {task.attachments.length > 0 && (
                        <div className="grid gap-2 border-t pt-4">
                            <h3 className="flex items-center gap-1.5 text-sm font-bold">
                                <Paperclip className="size-4" aria-hidden />{' '}
                                Lampiran soal
                            </h3>
                            <ul className="flex flex-wrap gap-2">
                                {task.attachments.map((file) => (
                                    <li key={file.id}>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <a href={file.url} download>
                                                <Download /> {file.name}{' '}
                                                <span className="font-mono text-xs">
                                                    ({formatFileSize(file.size)}
                                                    )
                                                </span>
                                            </a>
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </section>

                <section
                    aria-labelledby="answer-title"
                    className="grid gap-5 bg-card p-5 md:p-6"
                >
                    <div className="grid gap-1 border-b border-input pb-4">
                        <p className="font-medium">Berkas Jawaban</p>
                        <h2 id="answer-title" className="text-h2 font-bold">
                            {!canSubmit
                                ? `Jawaban ${typeLabel}`
                                : current
                                  ? `Ganti Jawaban ${typeLabel}`
                                  : `Unggah Berkas ${typeLabel}`}
                        </h2>
                    </div>
                    {current && (
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 border border-success/30 bg-success-soft px-4 py-3 text-sm text-success">
                            <CheckCircle2
                                className="size-4 shrink-0"
                                aria-hidden
                            />
                            <span className="font-bold">Terkumpul</span>
                            <span aria-hidden>·</span>
                            <span>
                                No.{' '}
                                <span className="font-mono font-bold">
                                    {current.receiptNumber}
                                </span>
                            </span>
                            <span aria-hidden>·</span>
                            <span>
                                {timestamp.format(
                                    new Date(current.submittedAt),
                                )}{' '}
                                WIB
                            </span>
                            {current.isLate && (
                                <StatusBadge
                                    status="late"
                                    label={current.lateLabel ?? undefined}
                                />
                            )}
                        </p>
                    )}
                    {!canSubmit ? (
                        <p className="text-sm text-muted-foreground">
                            {task.state === 'scheduled'
                                ? 'Tugas belum dibuka.'
                                : current
                                  ? 'Tenggat sudah lewat; submission terakhir Anda yang dinilai.'
                                  : 'Tenggat sudah lewat dan tugas ini tidak menerima pengumpulan terlambat.'}
                        </p>
                    ) : (
                        <Form
                            {...TaskController.submit.form(task.id)}
                            options={{ preserveScroll: true }}
                            onSuccess={() => {
                                setConfirming(false);
                                setDropzoneKey((k) => k + 1);
                            }}
                            className="grid gap-5"
                            resetOnSuccess
                        >
                            {({ processing, errors, progress, submit }) => (
                                <>
                                    {pastDue && (
                                        <p className="border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
                                            Tenggat sudah lewat. Pengumpulan
                                            akan diberi label{' '}
                                            <strong>Terlambat</strong>.
                                        </p>
                                    )}
                                    {task.allowedFormats.length > 0 && (
                                        <div className="grid gap-2">
                                            {task.textAnswer === 'required' && (
                                                <p className="text-sm text-muted-foreground">
                                                    Berkas opsional; jawaban
                                                    teks wajib diisi.
                                                </p>
                                            )}
                                            <AnswerDropzone
                                                key={dropzoneKey}
                                                formats={task.allowedFormats}
                                                limits={task.limits}
                                                invalid={!!errors.file}
                                            />
                                            {progress && (
                                                <div
                                                    role="progressbar"
                                                    aria-label="Mengunggah"
                                                    aria-valuenow={
                                                        progress.percentage
                                                    }
                                                    aria-valuemin={0}
                                                    aria-valuemax={100}
                                                    className="h-2 bg-primary-50"
                                                >
                                                    <div
                                                        className="h-full bg-primary transition-[width]"
                                                        style={{
                                                            width: `${progress.percentage}%`,
                                                        }}
                                                    />
                                                </div>
                                            )}
                                            <InputError message={errors.file} />
                                        </div>
                                    )}
                                    {task.textAnswer !== 'none' && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="answer-text">
                                                Jawaban teks{' '}
                                                {task.textAnswer === 'optional'
                                                    ? '(opsional)'
                                                    : '(wajib)'}
                                            </Label>
                                            <Textarea
                                                id="answer-text"
                                                name="text_answer"
                                                rows={8}
                                                maxLength={20000}
                                                defaultValue={
                                                    current?.textAnswer ?? ''
                                                }
                                                className="font-mono text-sm"
                                                placeholder={
                                                    'Mendukung Markdown sederhana. Blok kode:\n```python\nprint("halo")\n```'
                                                }
                                                aria-invalid={
                                                    !!errors.text_answer
                                                }
                                            />
                                            <InputError
                                                message={errors.text_answer}
                                            />
                                        </div>
                                    )}
                                    <InputError message={errors.submission} />
                                    <Button
                                        type="button"
                                        className="w-full justify-self-end bg-linear-to-r from-primary-500 to-primary-700 sm:w-fit"
                                        size="lg"
                                        disabled={processing}
                                        onClick={() => setConfirming(true)}
                                    >
                                        <Check /> Kumpulkan {typeLabel} Sekarang
                                    </Button>

                                    {/* US-P02-3: konfirmasi sebelum mengumpulkan. */}
                                    <Dialog
                                        open={confirming}
                                        onOpenChange={setConfirming}
                                    >
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle>
                                                    Kumpulkan sekarang?
                                                </DialogTitle>
                                                <DialogDescription>
                                                    {current
                                                        ? `Jawaban ini menggantikan versi ${current.version}. Versi lama tetap tersimpan di riwayat, tetapi hanya versi terbaru yang dinilai.`
                                                        : 'Waktu pengumpulan dicatat dengan jam server.'}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                    >
                                                        Periksa lagi
                                                    </Button>
                                                </DialogClose>
                                                <Button
                                                    type="button"
                                                    onClick={() => submit()}
                                                    disabled={processing}
                                                >
                                                    {processing ? (
                                                        <Spinner />
                                                    ) : (
                                                        <CheckCircle2 />
                                                    )}{' '}
                                                    Ya, Kumpulkan
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </>
                            )}
                        </Form>
                    )}
                </section>

                {history.length > 0 && (
                    <section
                        aria-labelledby="history-title"
                        className="grid gap-3"
                    >
                        <h2
                            id="history-title"
                            className="text-h3 font-bold text-primary-700"
                        >
                            Riwayat pengumpulan
                        </h2>
                        <ol className="grid gap-3">
                            {history.map((version) => (
                                <li
                                    key={version.id}
                                    className={cn(
                                        'grid gap-2 border bg-card p-4',
                                        !version.isCurrent && 'opacity-80',
                                    )}
                                >
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-mono text-sm font-bold">
                                            Versi {version.version}
                                        </span>
                                        {version.isCurrent ? (
                                            <Badge variant="success">
                                                Dinilai
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">
                                                Digantikan
                                            </Badge>
                                        )}
                                        {version.isLate && (
                                            <StatusBadge
                                                status="late"
                                                label={
                                                    version.lateLabel ??
                                                    undefined
                                                }
                                            />
                                        )}
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {timestamp.format(
                                                new Date(version.submittedAt),
                                            )}{' '}
                                            WIB · {version.receiptNumber}
                                        </span>
                                    </div>
                                    {version.file && (
                                        <a
                                            href={version.file.url}
                                            className="inline-flex w-fit items-center gap-1 text-sm text-primary-700 underline"
                                        >
                                            <FileText
                                                className="size-4"
                                                aria-hidden
                                            />{' '}
                                            {version.file.name} (
                                            {formatFileSize(version.file.size)})
                                        </a>
                                    )}
                                    {version.textAnswer && (
                                        <Markdown className="border-l-2 border-primary-200 pl-3 text-sm">
                                            {version.textAnswer}
                                        </Markdown>
                                    )}
                                </li>
                            ))}
                        </ol>
                    </section>
                )}
            </div>
        </>
    );
}
