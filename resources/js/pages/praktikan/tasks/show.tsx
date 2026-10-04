import { Form, Head, Link } from '@inertiajs/react';
import {
    AlarmClock,
    ArrowLeft,
    CheckCircle2,
    Download,
    FileText,
    Paperclip,
    Receipt,
    Send,
} from 'lucide-react';
import { useState } from 'react';
import TaskController from '@/actions/App/Http/Controllers/Praktikan/TaskController';
import InputError from '@/components/input-error';
import { Markdown } from '@/components/markdown';
import { PageHeader } from '@/components/page-header';
import { RichTextViewer } from '@/components/rich-text/rich-text-viewer';
import { StatusBadge } from '@/components/status-badge';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { useNow } from '@/hooks/use-now';
import { formatCountdown, formatTimeRange } from '@/lib/datetime';
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
    const current = history.find((version) => version.isCurrent);
    const pastDue = task.dueAt !== null && new Date(task.dueAt).getTime() < now;
    const canSubmit = task.state === 'open' && !(current && pastDue);
    const accept = task.allowedFormats.map((format) => `.${format}`).join(',');

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
                    description={`${TASK_TYPE_LABEL[task.type]} · ${task.course} · ${task.className}${task.meeting ? ` · Pertemuan ${task.meeting.number}` : ''}`}
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

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <article className="grid gap-5 border bg-card p-5 md:p-6">
                        <RichTextViewer content={task.body} />
                        {task.attachments.length > 0 && (
                            <div className="grid gap-2 border-t pt-4">
                                <h2 className="flex items-center gap-1.5 text-sm font-bold">
                                    <Paperclip className="size-4" aria-hidden />{' '}
                                    Lampiran soal
                                </h2>
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
                                                        (
                                                        {formatFileSize(
                                                            file.size,
                                                        )}
                                                        )
                                                    </span>
                                                </a>
                                            </Button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </article>

                    <aside className="grid gap-4">
                        <section
                            aria-labelledby="deadline-title"
                            className="grid gap-2 border bg-card p-5"
                        >
                            <h2
                                id="deadline-title"
                                className="text-sm font-bold text-primary-700"
                            >
                                Tenggat
                            </h2>
                            {task.dueAt ? (
                                <>
                                    <p className="font-mono text-sm">
                                        {task.openAt &&
                                            formatTimeRange(
                                                task.openAt,
                                                task.dueAt,
                                            )}
                                    </p>
                                    <p
                                        className={cn(
                                            'flex items-center gap-1.5 font-mono text-sm font-bold',
                                            pastDue
                                                ? 'text-danger'
                                                : 'text-primary-700',
                                        )}
                                        aria-live="polite"
                                    >
                                        <AlarmClock
                                            className="size-4"
                                            aria-hidden
                                        />
                                        {pastDue
                                            ? 'Tenggat sudah lewat'
                                            : `Sisa ${formatCountdown(task.dueAt, now)}`}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm">Belum ditentukan.</p>
                            )}
                            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                                <li>Nilai maksimal {task.maxScore}</li>
                                <li>
                                    {task.allowLate
                                        ? `Terlambat diizinkan${task.latePenalty ? ` · penalti ${task.latePenalty}% per ${task.latePenaltyUnit === 'day' ? 'hari' : 'jam'}` : ''}`
                                        : 'Terlambat tidak diizinkan'}
                                </li>
                            </ul>
                        </section>

                        {current && (
                            <section
                                aria-labelledby="receipt-title"
                                className="grid gap-2 border border-success/30 bg-success-soft p-5 text-sm"
                            >
                                <h2
                                    id="receipt-title"
                                    className="flex items-center gap-1.5 font-bold text-success"
                                >
                                    <Receipt className="size-4" aria-hidden />{' '}
                                    Tanda terima
                                </h2>
                                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                                    <dt className="text-muted-foreground">
                                        Nomor
                                    </dt>
                                    <dd className="font-mono font-bold">
                                        {current.receiptNumber}
                                    </dd>
                                    <dt className="text-muted-foreground">
                                        Waktu server
                                    </dt>
                                    <dd className="font-mono">
                                        {timestamp.format(
                                            new Date(current.submittedAt),
                                        )}{' '}
                                        WIB
                                    </dd>
                                    {current.file && (
                                        <>
                                            <dt className="text-muted-foreground">
                                                File
                                            </dt>
                                            <dd className="break-all">
                                                {current.file.name} ·{' '}
                                                <span className="font-mono">
                                                    {formatFileSize(
                                                        current.file.size,
                                                    )}
                                                </span>
                                            </dd>
                                            <dt className="text-muted-foreground">
                                                SHA-256
                                            </dt>
                                            <dd className="font-mono text-[11px] break-all">
                                                {current.sha256}
                                            </dd>
                                        </>
                                    )}
                                    <dt className="text-muted-foreground">
                                        Versi
                                    </dt>
                                    <dd>{current.version}</dd>
                                </dl>
                                {current.isLate && (
                                    <StatusBadge
                                        status="late"
                                        label={current.lateLabel ?? undefined}
                                        className="mt-1"
                                    />
                                )}
                            </section>
                        )}
                    </aside>
                </div>

                <section
                    aria-labelledby="answer-title"
                    className="grid gap-4 border bg-card p-5 md:p-6"
                >
                    <h2
                        id="answer-title"
                        className="text-h3 font-bold text-primary-700"
                    >
                        {current ? 'Ganti jawaban' : 'Kumpulkan jawaban'}
                    </h2>
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
                            onSuccess={() => setConfirming(false)}
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
                                            <Label htmlFor="answer-file">
                                                File jawaban (
                                                {task.allowedFormats
                                                    .map(
                                                        (f) =>
                                                            `${f.toUpperCase()} ≤ ${task.limits[f]} MB`,
                                                    )
                                                    .join(' atau ')}
                                                )
                                                {task.textAnswer ===
                                                    'required' && ' · opsional'}
                                            </Label>
                                            <Input
                                                id="answer-file"
                                                name="file"
                                                type="file"
                                                accept={accept}
                                                aria-invalid={!!errors.file}
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
                                        className="w-fit"
                                        size="lg"
                                        disabled={processing}
                                        onClick={() => setConfirming(true)}
                                    >
                                        <Send /> Kumpulkan
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
