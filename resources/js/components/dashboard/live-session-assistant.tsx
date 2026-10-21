import { Link } from '@inertiajs/react';
import { ClipboardCheck, FileText, Timer, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNow } from '@/hooks/use-now';
import { formatCountdown, formatIsoClock as clock } from '@/lib/datetime';
import { TASK_TYPE_LABEL } from '@/lib/task';
import type { AsistenLiveSession } from '@/types';

/** Lencana "Sedang berlangsung" berdenyut. */
export function LiveBadge() {
    return (
        <span className="inline-flex w-fit items-center gap-1.5 bg-success-soft px-2 py-0.5 text-xs font-bold text-success">
            <span
                className="size-2 animate-pulse rounded-full bg-success"
                aria-hidden
            />
            Sedang berlangsung
        </span>
    );
}

/**
 * Panel "Sesi Berlangsung" (Asisten): sesi mulai otomatis sesuai jam kelas;
 * pintasan presensi & membuat Pre/Post-Test/Laporan untuk kelas itu.
 */
export function LiveSessionAssistant({
    session,
}: {
    session: AsistenLiveSession;
}) {
    const now = useNow(30_000);
    const create = (type: 'pretest' | 'posttest' | 'report') =>
        `/asisten/tasks/create?type=${type}&class=${session.classId}`;

    return (
        <section
            aria-label={`Sesi berlangsung ${session.course} ${session.className}`}
            className="grid gap-4 border-l-4 border-success bg-card p-5 shadow-sm"
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                    <LiveBadge />
                    <h2 className="text-h3 font-bold text-primary-900">
                        {session.course} · {session.className}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Pertemuan {session.number}
                        {session.topic && ` · ${session.topic}`}
                        {session.room && ` · ${session.room}`} ·{' '}
                        {clock(session.startsAt)}–{clock(session.endsAt)} WIB
                    </p>
                </div>
                <p className="flex items-center gap-1.5 font-mono text-sm text-primary-700">
                    <Timer className="size-4" aria-hidden /> Sisa{' '}
                    {formatCountdown(session.endsAt, now)}
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Button asChild>
                    <Link href={`/asisten/sessions/${session.meetingId}`}>
                        <UserCheck /> Isi Presensi
                        <span className="font-mono text-xs opacity-80">
                            {session.attendanceCount}/{session.members}
                        </span>
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href={create('pretest')}>
                        <ClipboardCheck /> Buat Pre-Test
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href={create('posttest')}>
                        <ClipboardCheck /> Buat Post-Test
                    </Link>
                </Button>
                <Button variant="outline" asChild>
                    <Link href={create('report')}>
                        <FileText /> Laporan Praktikum
                    </Link>
                </Button>
            </div>

            {session.tasks.length > 0 && (
                <ul className="divide-y border-t">
                    {session.tasks.map((task) => (
                        <li
                            key={task.id}
                            className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                        >
                            <Link
                                href={`/asisten/tasks/${task.taskId}/edit`}
                                className="font-medium hover:underline"
                            >
                                <span className="mr-2 font-mono text-xs text-primary-700">
                                    {TASK_TYPE_LABEL[task.type]}
                                </span>
                                {task.title}
                            </Link>
                            <span className="font-mono text-xs text-muted-foreground">
                                {task.submitted}/{session.members} mengumpulkan
                                {task.dueAt &&
                                    ` · tutup ${formatCountdown(task.dueAt, now)} lagi`}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
