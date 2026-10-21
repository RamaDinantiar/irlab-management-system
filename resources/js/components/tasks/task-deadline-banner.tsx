import { useNow } from '@/hooks/use-now';
import { cn } from '@/lib/utils';
import type { TaskState } from '@/types';

const clock = new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
});
const dayMonth = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Jakarta',
});
const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' });
const submitted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
});

const pad = (n: number) => String(n).padStart(2, '0');

/** "18 : 42" + satuan, mengikuti sisa waktu (hari/jam/menit). */
function countdown(ms: number): { value: string; unit: string } {
    const s = Math.max(0, Math.floor(ms / 1000));

    if (s >= 86_400) {
        return {
            value: `${pad(Math.floor(s / 86_400))} : ${pad(Math.floor((s % 86_400) / 3600))}`,
            unit: 'Hari : Jam tersisa',
        };
    }

    if (s >= 3600) {
        return {
            value: `${pad(Math.floor(s / 3600))} : ${pad(Math.floor((s % 3600) / 60))}`,
            unit: 'Jam : Menit tersisa',
        };
    }

    return {
        value: `${pad(Math.floor(s / 60))} : ${pad(s % 60)}`,
        unit: 'Menit : Detik tersisa',
    };
}

/**
 * Banner Figma "Task (Pre-Test) - Praktikan": status, batas waktu, aturan
 * keterlambatan, dan hitung mundur sisa waktu pengerjaan. Bila form
 * pengumpulan sudah tertutup, tampil abu-abu (Figma "Task (Post/Pre Test)").
 */
export function TaskDeadlineBanner({
    typeLabel,
    state,
    openAt,
    dueAt,
    allowLate,
    latePenalty,
    latePenaltyUnit,
    maxScore,
    accepting,
    submittedAt,
}: {
    typeLabel: string;
    state: TaskState;
    openAt: string | null;
    dueAt: string | null;
    allowLate: boolean;
    latePenalty: number | null;
    latePenaltyUnit: 'hour' | 'day' | null;
    maxScore: number;
    /** Form pengumpulan masih menerima jawaban (termasuk terlambat). */
    accepting: boolean;
    submittedAt: string | null;
}) {
    const coarse = useNow(30_000);
    const due = dueAt ? new Date(dueAt).getTime() : null;
    // Detik berjalan hanya saat sisa < 1 jam.
    const now = useNow(
        due !== null && due - coarse < 3_600_000 ? 1000 : 30_000,
    );
    const notOpen = state === 'scheduled';
    const ended = state === 'closed' || (due !== null && due <= now);
    const target = notOpen && openAt ? new Date(openAt).getTime() : due;
    const left = target !== null ? countdown(target - now) : null;
    const start = openAt ? new Date(openAt).getTime() : null;
    const elapsed =
        start !== null && due !== null && due > start
            ? Math.min(100, Math.max(0, ((now - start) / (due - start)) * 100))
            : null;

    const status = notOpen
        ? {
              label: `${typeLabel} Belum Dibuka`,
              tone: 'border-white/60 bg-white/15',
              dot: 'bg-white',
          }
        : ended
          ? {
                label: 'Lewat Batas Waktu · Terlambat Diterima',
                tone: 'border-[#fecaca] bg-[#b91c1c]',
                dot: 'bg-[#fecaca]',
            }
          : {
                label: `${typeLabel} Sedang Berlangsung`,
                tone: 'border-[#82f294] bg-[#016c12]',
                dot: 'bg-[#82f294]',
            };

    const deadline = dueAt
        ? `${ymd.format(new Date(dueAt)) === ymd.format(new Date(now)) ? '' : `${dayMonth.format(new Date(dueAt))} · `}${clock.format(new Date(dueAt))} WIB`
        : null;

    const penalty = latePenalty
        ? ` dan penalti ${latePenalty}% per ${latePenaltyUnit === 'day' ? 'hari' : 'jam'}`
        : '';

    if (!notOpen && !accepting) {
        return (
            <section
                aria-labelledby="deadline-title"
                className="grid content-start justify-items-start gap-3 border border-[#bfbfbf] bg-[#e6e6e6] p-5 text-[#595959] md:p-6"
            >
                <span className="inline-flex items-center gap-2 border border-[#999999] bg-[#bfbfbf] px-3 py-1.5 text-xs font-medium">
                    <span
                        aria-hidden
                        className="size-2.5 rounded-full bg-[#595959]"
                    />
                    {typeLabel} Tidak Tersedia
                </span>
                <h2
                    id="deadline-title"
                    className="text-h2 font-bold md:text-[2rem]"
                >
                    {typeLabel} Sudah Berakhir
                </h2>
                <p className="max-w-3xl">
                    {deadline
                        ? `Batas waktu pengumpulan ${deadline} sudah lewat dan form pengumpulan telah ditutup.`
                        : 'Form pengumpulan telah ditutup.'}{' '}
                    {submittedAt
                        ? `Jawaban Anda tercatat pada ${submitted.format(new Date(submittedAt))} WIB.`
                        : `Anda tidak mengumpulkan jawaban untuk ${typeLabel} ini.`}
                </p>
            </section>
        );
    }

    return (
        <section
            aria-labelledby="deadline-title"
            className="grid gap-6 bg-linear-to-r from-primary-700 to-primary-500 p-5 text-white md:p-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center"
        >
            <div className="grid content-start justify-items-start gap-3">
                <span
                    className={cn(
                        'inline-flex items-center gap-2 border px-3 py-1.5 text-xs font-medium',
                        status.tone,
                    )}
                >
                    <span
                        aria-hidden
                        className={cn('size-2.5 rounded-full', status.dot)}
                    />
                    {status.label}
                </span>
                <h2
                    id="deadline-title"
                    className="text-h2 font-bold md:text-[2rem]"
                >
                    {deadline
                        ? `Batas Waktu Pengumpulan: ${deadline}`
                        : 'Batas waktu belum ditentukan'}
                </h2>
                <p className="max-w-2xl">
                    {allowLate
                        ? `Pengumpulan setelah batas waktu tetap diterima, tetapi diberi label Terlambat${penalty}.`
                        : 'Pengumpulan yang melewati batas waktu otomatis menutup form pengumpulan.'}{' '}
                    Nilai maksimal {maxScore}.
                </p>
            </div>

            {left && (
                <div className="grid justify-items-center gap-1 border border-white bg-white/20 px-6 py-4 text-center">
                    <span className="text-sm font-medium text-[#c4fdce]">
                        {notOpen ? 'Dibuka Dalam' : 'Sisa Waktu Pengerjaan'}
                    </span>
                    <span
                        role="timer"
                        className="text-[2.75rem] leading-none font-bold tabular-nums md:text-[3.5rem]"
                    >
                        {ended ? '00 : 00' : left.value}
                    </span>
                    <span className="text-xs text-[#c4fdce]">
                        {ended ? 'Batas waktu sudah lewat' : left.unit}
                    </span>
                    {elapsed !== null && !notOpen && (
                        <div
                            role="progressbar"
                            aria-label="Waktu pengerjaan berjalan"
                            aria-valuenow={Math.round(elapsed)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            className="mt-2 h-1.5 w-full rounded-full bg-[#2f6e7f]"
                        >
                            <div
                                className="h-full rounded-full bg-primary-500"
                                style={{ width: `${elapsed}%` }}
                            />
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
