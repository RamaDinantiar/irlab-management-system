import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCheck, Play, Save, Users } from 'lucide-react';
import { useState } from 'react';
import SessionController from '@/actions/App/Http/Controllers/Asisten/SessionController';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatDate, formatRelative } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { AttendanceStatus, MeetingRow } from '@/types';

const OPTIONS: { value: AttendanceStatus; label: string; active: string }[] = [
    {
        value: 'hadir',
        label: 'Hadir',
        active: 'border-success bg-success-soft text-success',
    },
    {
        value: 'izin',
        label: 'Izin',
        active: 'border-primary-700 bg-primary-50 text-primary-700',
    },
    {
        value: 'sakit',
        label: 'Sakit',
        active: 'border-primary-700 bg-primary-50 text-primary-700',
    },
    {
        value: 'alfa',
        label: 'Alfa',
        active: 'border-danger bg-danger-soft text-danger',
    },
];

type Student = {
    id: number;
    nim: string | null;
    name: string;
    status: AttendanceStatus | null;
};

/** FR-AD-01: layar sesi — mulai pertemuan + checklist presensi. */
export default function SessionShow({
    meeting,
    klass,
    students,
}: {
    meeting: MeetingRow;
    klass: {
        id: number;
        name: string;
        course: string;
        startTime: string;
        endTime: string;
        room: string;
        canEdit: boolean;
    };
    students: Student[];
}) {
    const [statuses, setStatuses] = useState<
        Record<number, AttendanceStatus | null>
    >(
        Object.fromEntries(
            students.map((student) => [student.id, student.status]),
        ),
    );
    const filled = Object.values(statuses).filter(Boolean).length;
    const started = meeting.startedAt !== null;

    return (
        <>
            <Head title={`Sesi ${klass.course} · ${klass.name}`} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <Link
                    href={SessionController.index.url()}
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
                >
                    <ArrowLeft className="size-4" aria-hidden /> Semua sesi
                </Link>
                <PageHeader
                    title={`${klass.course} · ${klass.name}`}
                    description={`Pertemuan ${meeting.number}${meeting.moduleTitle ? ` · ${meeting.moduleTitle}` : ''} · ${formatDate(meeting.date)} · ${klass.startTime.replace(':', '.')}–${klass.endTime.replace(':', '.')} · ${klass.room}`}
                    actions={
                        started ? (
                            <Badge variant="success">
                                Dimulai {formatRelative(meeting.startedAt!)}
                            </Badge>
                        ) : (
                            klass.canEdit && (
                                <Form
                                    {...SessionController.start.form(
                                        meeting.id,
                                    )}
                                    options={{ preserveScroll: true }}
                                >
                                    {({ processing }) => (
                                        <Button
                                            type="submit"
                                            size="lg"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <Play />
                                            )}{' '}
                                            Mulai Sesi
                                        </Button>
                                    )}
                                </Form>
                            )
                        )
                    }
                />

                {!started && (
                    <p className="border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900">
                        Menekan <strong>Mulai Sesi</strong> menandai pertemuan
                        dimulai, membuka Pre-test yang dijadwalkan untuk sesi
                        ini, dan menyiapkan draft laporan ngawas.
                    </p>
                )}

                {students.length === 0 ? (
                    <EmptyState icon={Users} title="Belum ada anggota kelas" />
                ) : (
                    <Form
                        {...SessionController.saveAttendance.form(meeting.id)}
                        options={{ preserveScroll: true }}
                        transform={() => ({ attendance: statuses })}
                        className="grid gap-4"
                    >
                        {({ processing }) => (
                            <>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h2 className="text-h3 font-bold text-primary-700">
                                        Presensi{' '}
                                        <span className="font-mono text-sm text-muted-foreground">
                                            ({filled}/{students.length} dicatat)
                                        </span>
                                    </h2>
                                    {klass.canEdit && (
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    setStatuses((current) =>
                                                        Object.fromEntries(
                                                            Object.entries(
                                                                current,
                                                            ).map(
                                                                ([
                                                                    id,
                                                                    status,
                                                                ]) => [
                                                                    id,
                                                                    status ??
                                                                        'hadir',
                                                                ],
                                                            ),
                                                        ),
                                                    )
                                                }
                                            >
                                                <CheckCheck /> Sisanya Hadir
                                            </Button>
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                            >
                                                {processing ? (
                                                    <Spinner />
                                                ) : (
                                                    <Save />
                                                )}{' '}
                                                Simpan Presensi
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <ul className="divide-y divide-primary-50 border bg-card">
                                    {students.map((student) => (
                                        <li
                                            key={student.id}
                                            className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                            <div>
                                                <span className="block font-mono text-xs font-bold text-primary-700">
                                                    {student.nim}
                                                </span>
                                                <span className="font-medium">
                                                    {student.name}
                                                </span>
                                            </div>
                                            <fieldset
                                                className="flex flex-wrap gap-1.5"
                                                disabled={!klass.canEdit}
                                            >
                                                <legend className="sr-only">
                                                    Presensi {student.name}
                                                </legend>
                                                {OPTIONS.map((option) => {
                                                    const checked =
                                                        statuses[student.id] ===
                                                        option.value;

                                                    return (
                                                        <label
                                                            key={option.value}
                                                            className={cn(
                                                                'cursor-pointer border px-3 py-1.5 text-sm font-medium has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40',
                                                                checked
                                                                    ? option.active
                                                                    : 'bg-white hover:bg-primary-50',
                                                            )}
                                                        >
                                                            <input
                                                                type="radio"
                                                                className="sr-only"
                                                                name={`att-${student.id}`}
                                                                value={
                                                                    option.value
                                                                }
                                                                checked={
                                                                    checked
                                                                }
                                                                onChange={() =>
                                                                    setStatuses(
                                                                        (
                                                                            current,
                                                                        ) => ({
                                                                            ...current,
                                                                            [student.id]:
                                                                                option.value,
                                                                        }),
                                                                    )
                                                                }
                                                            />
                                                            {option.label}
                                                        </label>
                                                    );
                                                })}
                                            </fieldset>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </Form>
                )}
            </div>
        </>
    );
}
