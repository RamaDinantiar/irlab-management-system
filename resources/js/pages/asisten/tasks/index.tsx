import { Form, Head, Link } from '@inertiajs/react';
import { ClipboardList, CopyPlus, Pencil, Plus } from 'lucide-react';
import TaskController from '@/actions/App/Http/Controllers/Asisten/TaskController';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNow } from '@/hooks/use-now';
import { formatCountdown, formatRelative } from '@/lib/datetime';
import { TASK_TYPE_LABEL } from '@/lib/task';
import type { TaskState, TaskType } from '@/types';

type TaskRow = {
    id: number;
    type: TaskType;
    title: string;
    course: string;
    status: 'draft' | 'published';
    meetingNumber: number | null;
    canEdit: boolean;
    targets: {
        id: number;
        className: string;
        state: TaskState;
        openAt: string | null;
        dueAt: string | null;
        windowMinutes: number | null;
        submitted: number;
        members: number;
    }[];
};

const STATE_LABEL: Record<TaskState, string> = {
    draft: 'Draft',
    scheduled: 'Terjadwal',
    open: 'Terbuka',
    closed: 'Ditutup',
};

/** Asisten › Task Management (FR-AT). */
export default function TasksIndex({
    type,
    tasks,
}: {
    type: TaskType | null;
    tasks: TaskRow[];
}) {
    const now = useNow();
    const title = type ? TASK_TYPE_LABEL[type] : 'Semua Tugas';

    return (
        <>
            <Head title={`Task · ${title}`} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title={`Task · ${title}`}
                    description="Buat soal, atur kelas & tenggat, lalu terbitkan. Status per kelas: Draft · Terjadwal · Terbuka · Ditutup."
                    actions={
                        <Button asChild>
                            <Link
                                href={TaskController.create.url({
                                    query: { type: type ?? 'posttest' },
                                })}
                            >
                                <Plus /> Buat Tugas
                            </Link>
                        </Button>
                    }
                />

                {tasks.length === 0 ? (
                    <EmptyState
                        icon={ClipboardList}
                        title="Belum ada tugas"
                        description="Buat tugas pertama untuk kelas yang Anda ampu."
                    />
                ) : (
                    <ul className="grid gap-4">
                        {tasks.map((task) => (
                            <li key={task.id} className="border bg-card">
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="secondary">
                                                {TASK_TYPE_LABEL[task.type]}
                                            </Badge>
                                            {task.status === 'draft' && (
                                                <StatusBadge status="draft" />
                                            )}
                                            {task.meetingNumber && (
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    Pertemuan{' '}
                                                    {task.meetingNumber}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-h3 font-bold text-primary-700">
                                            {task.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {task.course}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            asChild
                                        >
                                            <Link
                                                href={TaskController.edit.url(
                                                    task.id,
                                                )}
                                            >
                                                <Pencil />{' '}
                                                {task.canEdit
                                                    ? 'Ubah'
                                                    : 'Lihat'}
                                            </Link>
                                        </Button>
                                        <Form
                                            {...TaskController.duplicate.form(
                                                task.id,
                                            )}
                                        >
                                            {({ processing }) => (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    type="submit"
                                                    disabled={processing}
                                                    aria-label={`Duplikasi ${task.title}`}
                                                >
                                                    <CopyPlus />
                                                </Button>
                                            )}
                                        </Form>
                                        {task.canEdit &&
                                            task.targets.every(
                                                (target) =>
                                                    target.submitted === 0,
                                            ) && (
                                                <ConfirmDeleteDialog
                                                    action={TaskController.destroy.form(
                                                        task.id,
                                                    )}
                                                    title={`Hapus “${task.title}”?`}
                                                    description="Tugas, target kelas, dan lampirannya dihapus."
                                                />
                                            )}
                                    </div>
                                </div>
                                {task.targets.length === 0 ? (
                                    <p className="px-5 py-3 text-sm text-muted-foreground">
                                        Belum ada kelas tujuan.
                                    </p>
                                ) : (
                                    <ul className="divide-y divide-primary-50">
                                        {task.targets.map((target) => (
                                            <li
                                                key={target.id}
                                                className="grid gap-2 px-5 py-3 sm:grid-cols-[10rem_1fr_auto] sm:items-center"
                                            >
                                                <span className="font-bold">
                                                    {target.className}
                                                </span>
                                                <span className="font-mono text-sm">
                                                    {target.dueAt
                                                        ? target.state ===
                                                          'open'
                                                            ? `Tenggat ${formatCountdown(target.dueAt, now)} lagi`
                                                            : target.state ===
                                                                'scheduled'
                                                              ? `Dibuka ${target.openAt ? formatRelative(target.openAt, now) : ''}`
                                                              : `Tenggat ${formatRelative(target.dueAt, now)}`
                                                        : target.windowMinutes
                                                          ? `Dibuka saat sesi dimulai · ${target.windowMinutes} menit`
                                                          : 'Waktu belum diatur'}
                                                </span>
                                                <span className="flex flex-wrap items-center gap-2">
                                                    <StatusBadge
                                                        status={target.state}
                                                        label={
                                                            STATE_LABEL[
                                                                target.state
                                                            ]
                                                        }
                                                    />
                                                    <span
                                                        className="font-mono text-xs"
                                                        aria-label={`${target.submitted} dari ${target.members} mengumpulkan`}
                                                    >
                                                        {target.submitted}/
                                                        {target.members}
                                                    </span>
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
