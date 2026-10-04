import { Head, Link } from '@inertiajs/react';
import { AlarmClock, ClipboardList } from 'lucide-react';
import { useMemo, useState } from 'react';
import TaskController from '@/actions/App/Http/Controllers/Praktikan/TaskController';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useNow } from '@/hooks/use-now';
import { formatCountdown, formatRelative } from '@/lib/datetime';
import { TASK_TYPE_LABEL } from '@/lib/task';
import { cn } from '@/lib/utils';
import type { StudentTask, TaskType } from '@/types';

const ALL = 'all';
const DAY_MS = 86_400_000;

/** Praktikan › Task (FR-PT-01): filter jenis (menu), kelas, status. */
export default function PraktikanTasks({
    type,
    tasks,
}: {
    type: TaskType | null;
    tasks: StudentTask[];
}) {
    const now = useNow();
    const [klass, setKlass] = useState(ALL);
    const [status, setStatus] = useState(ALL);
    const classes = useMemo(
        () => [
            ...new Set(
                tasks.map((task) => `${task.course} · ${task.className}`),
            ),
        ],
        [tasks],
    );
    const filtered = tasks.filter(
        (task) =>
            (klass === ALL || `${task.course} · ${task.className}` === klass) &&
            (status === ALL || task.status === status),
    );
    const title = type ? TASK_TYPE_LABEL[type] : 'Semua Tugas';

    return (
        <>
            <Head title={`Task · ${title}`} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title={`Task · ${title}`}
                    description="Tugas dari kelas yang Anda ikuti. Kumpulkan sebelum tenggat; Anda dapat mengganti jawaban selama tenggat belum lewat."
                />

                <div className="flex flex-wrap gap-3">
                    <div className="grid gap-2">
                        <Label htmlFor="filter-class">Kelas</Label>
                        <Select value={klass} onValueChange={setKlass}>
                            <SelectTrigger id="filter-class" className="w-64">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>Semua kelas</SelectItem>
                                {classes.map((name) => (
                                    <SelectItem key={name} value={name}>
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="filter-status">Status</Label>
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger id="filter-status" className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    Semua status
                                </SelectItem>
                                <SelectItem value="not_submitted">
                                    Belum
                                </SelectItem>
                                <SelectItem value="submitted">
                                    Terkumpul
                                </SelectItem>
                                <SelectItem value="late">Terlambat</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <EmptyState
                        icon={ClipboardList}
                        title="Tidak ada tugas"
                        description="Tugas akan muncul di sini ketika asisten membukanya."
                    />
                ) : (
                    <ul className="grid gap-3">
                        {filtered.map((task) => {
                            const urgent =
                                task.status === 'not_submitted' &&
                                task.state === 'open' &&
                                task.dueAt &&
                                new Date(task.dueAt).getTime() - now < DAY_MS;

                            return (
                                <li key={task.id}>
                                    <Link
                                        href={TaskController.show.url(task.id)}
                                        prefetch
                                        className="grid gap-2 border bg-card p-4 transition-colors hover:bg-primary-50/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none sm:grid-cols-[1fr_auto] sm:items-center"
                                    >
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary">
                                                    {TASK_TYPE_LABEL[task.type]}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {task.course} ·{' '}
                                                    {task.className}
                                                </span>
                                            </div>
                                            <p className="font-bold">
                                                {task.title}
                                            </p>
                                            {task.dueAt && (
                                                <p
                                                    className={cn(
                                                        'flex items-center gap-1 font-mono text-xs',
                                                        urgent &&
                                                            'font-bold text-danger',
                                                    )}
                                                >
                                                    <AlarmClock
                                                        className="size-3.5"
                                                        aria-hidden
                                                    />
                                                    {urgent &&
                                                        'Tenggat < 24 jam · '}
                                                    {task.state === 'open' &&
                                                    new Date(
                                                        task.dueAt,
                                                    ).getTime() > now
                                                        ? `${formatCountdown(task.dueAt, now)} lagi`
                                                        : `Tenggat ${formatRelative(task.dueAt, now)}`}
                                                </p>
                                            )}
                                        </div>
                                        <span className="flex flex-wrap items-center gap-2">
                                            {task.state === 'closed' &&
                                                task.status ===
                                                    'not_submitted' && (
                                                    <StatusBadge status="closed" />
                                                )}
                                            <StatusBadge
                                                status={task.status}
                                                label={
                                                    task.status ===
                                                    'not_submitted'
                                                        ? 'Belum'
                                                        : undefined
                                                }
                                            />
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </>
    );
}
