import { Head, usePage } from '@inertiajs/react';
import {
    BookOpen,
    CalendarPlus,
    FilePlus2,
    ListFilter,
    MessageSquareWarning,
    Pencil,
    School,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import ClassProposalController from '@/actions/App/Http/Controllers/Asisten/ClassProposalController';
import CourseProposalController from '@/actions/App/Http/Controllers/Asisten/CourseProposalController';
import { ClassCard } from '@/components/classes/class-card';
import { ClassFormDialog } from '@/components/classes/class-form-dialog';
import { CourseFormDialog } from '@/components/courses/course-form-dialog';
import { CourseWeights } from '@/components/courses/course-weights';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ClassRow, CourseRow, SelectOption } from '@/types';

type Props = {
    semester: { id: number; name: string } | null;
    classes: ClassRow[];
    proposals: CourseRow[];
    options: { courses: SelectOption[]; rooms: SelectOption[] };
};

type Filter = 'all' | 'open' | 'locked' | 'pending';
type Sort = 'day' | 'course' | 'fill';

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'all', label: 'Semua Kelas' },
    { value: 'open', label: 'Kelas Dibuka' },
    { value: 'locked', label: 'Kelas Terkunci' },
    { value: 'pending', label: 'Menunggu Persetujuan' },
];

const SORTS: { value: Sort; label: string }[] = [
    { value: 'day', label: 'Urutkan Jadwal Hari' },
    { value: 'course', label: 'Urutkan Mata Kuliah' },
    { value: 'fill', label: 'Urutkan Paling Penuh' },
];

const matches = (klass: ClassRow, filter: Filter): boolean => {
    const approved = klass.approvalStatus === 'approved';

    return {
        all: true,
        open: approved && !klass.isLocked,
        locked: approved && klass.isLocked,
        pending: !approved,
    }[filter];
};

/**
 * Asisten › Class (FR-AC-01, FR-AS-02, US-A01) — Figma "Class": ringkasan
 * kelas & kursi, filter pendaftaran, kartu kelas (token, kunci pendaftaran,
 * anggota/kuota), dan pengajuan mata kuliah.
 */
export default function AsistenClassIndex({
    semester,
    classes,
    proposals,
    options,
}: Props) {
    const [filter, setFilter] = useState<Filter>('all');
    const [sort, setSort] = useState<Sort>('day');

    const active = classes.filter((c) => c.approvalStatus === 'approved');
    const credits = [
        ...new Map(
            active.map((c) => [c.course?.id, c.course?.credits ?? 0]),
        ).values(),
    ].reduce((sum, n) => sum + n, 0);
    const members = active.reduce((sum, c) => sum + c.membersCount, 0);
    const seats = active.reduce((sum, c) => sum + c.quota, 0);
    const filledPercent = seats > 0 ? (members / seats) * 100 : 0;
    const labs = new Set(active.map((c) => c.room?.id).filter(Boolean)).size;

    const counts = Object.fromEntries(
        FILTERS.map((f) => [
            f.value,
            classes.filter((c) => matches(c, f.value)).length,
        ]),
    ) as Record<Filter, number>;

    const visible = useMemo(() => {
        const rows = classes.filter((c) => matches(c, filter));
        const byDay = (a: ClassRow, b: ClassRow) =>
            a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime);

        return [...rows].sort(
            sort === 'course'
                ? (a, b) =>
                      (a.course?.name ?? '').localeCompare(
                          b.course?.name ?? '',
                      ) || a.name.localeCompare(b.name)
                : sort === 'fill'
                  ? (a, b) =>
                        b.membersCount / (b.quota || 1) -
                            a.membersCount / (a.quota || 1) || byDay(a, b)
                  : byDay,
        );
    }, [classes, filter, sort]);

    const isAdmin = usePage().props.auth.user.role === 'admin';

    return (
        <>
            <Head title="Class" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Class"
                    description={
                        semester
                            ? isAdmin
                                ? `Seluruh kelas praktikum pada ${semester.name}.`
                                : `Mata kuliah yang Anda ampu pada ${semester.name}.`
                            : 'Belum ada semester aktif.'
                    }
                    actions={
                        semester && (
                            <>
                                {options.courses.length > 0 && (
                                    <ClassFormDialog
                                        action={ClassProposalController.store.form()}
                                        title="Ajukan Kelas"
                                        description="Kelas baru menunggu persetujuan Admin; token dibuat setelah disetujui."
                                        submitLabel="Kirim Pengajuan"
                                        courses={options.courses}
                                        rooms={options.rooms}
                                        trigger={
                                            <Button>
                                                <CalendarPlus /> Ajukan Kelas
                                            </Button>
                                        }
                                    />
                                )}
                                <CourseFormDialog
                                    action={CourseProposalController.store.form()}
                                    title="Ajukan Mata Kuliah"
                                    description="Pengajuan dikirim ke Admin. Setelah disetujui, Anda otomatis menjadi asisten pengampu."
                                    submitLabel="Kirim Pengajuan"
                                    trigger={
                                        <Button variant="outline">
                                            <FilePlus2 /> Ajukan Mata Kuliah
                                        </Button>
                                    }
                                />
                            </>
                        )
                    }
                />

                <div className="grid gap-4 md:grid-cols-2">
                    <section
                        aria-labelledby="stat-classes"
                        className="grid gap-3 border bg-card p-5 shadow-sm"
                    >
                        <h2 id="stat-classes" className="font-medium">
                            Total Kelas Aktif
                        </h2>
                        <p className="text-[2.5rem] leading-none font-bold">
                            {active.length} Kelas
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-primary-700">
                            <BookOpen className="size-4" aria-hidden />
                            {credits} SKS praktikum diampu semester ini
                        </p>
                    </section>
                    <section
                        aria-labelledby="stat-members"
                        className="grid gap-3 border bg-card p-5 shadow-sm"
                    >
                        <h2 id="stat-members" className="font-medium">
                            Total Praktikan Terdaftar
                        </h2>
                        <p className="text-[2.5rem] leading-none font-bold">
                            {members} / {seats} Kursi
                        </p>
                        <div className="flex items-center gap-4">
                            <div
                                role="progressbar"
                                aria-label="Kursi terisi"
                                aria-valuenow={members}
                                aria-valuemin={0}
                                aria-valuemax={seats}
                                className="h-1.5 flex-1 bg-primary-100"
                            >
                                <div
                                    className="h-full bg-primary-700"
                                    style={{ width: `${filledPercent}%` }}
                                />
                            </div>
                            <span className="text-xs text-primary-700">
                                {Math.round(filledPercent)}% Terisi ({labs} Lab)
                            </span>
                        </div>
                    </section>
                </div>

                <section aria-labelledby="classes-title" className="grid gap-4">
                    <h2 id="classes-title" className="sr-only">
                        Kelas Saya
                    </h2>
                    <div className="flex flex-wrap items-center justify-between gap-3 border bg-card p-4 shadow-sm">
                        <div
                            role="group"
                            aria-label="Filter kelas"
                            className="flex flex-wrap gap-2"
                        >
                            {FILTERS.filter(
                                (f) => f.value !== 'pending' || counts.pending,
                            ).map((f) => (
                                <button
                                    key={f.value}
                                    type="button"
                                    aria-pressed={filter === f.value}
                                    onClick={() => setFilter(f.value)}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2 text-sm font-medium',
                                        filter === f.value
                                            ? 'bg-primary-700 text-white'
                                            : 'hover:bg-primary-50',
                                    )}
                                >
                                    {f.label}
                                    <span
                                        className={cn(
                                            'flex size-5 items-center justify-center rounded-full text-[11px] font-bold',
                                            filter === f.value
                                                ? 'bg-white/25'
                                                : 'bg-primary-100 text-primary-700',
                                        )}
                                    >
                                        {counts[f.value]}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <Select
                            value={sort}
                            onValueChange={(v) => setSort(v as Sort)}
                        >
                            <SelectTrigger
                                aria-label="Urutkan kelas"
                                className="w-auto gap-2 font-medium"
                            >
                                <ListFilter className="size-4" aria-hidden />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent align="end">
                                {SORTS.map((option) => (
                                    <SelectItem
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {classes.length === 0 ? (
                        <EmptyState
                            icon={School}
                            title="Belum ada kelas"
                            description="Ajukan kelas untuk mata kuliah yang Anda ampu, atau minta Admin menugaskan Anda."
                        />
                    ) : visible.length === 0 ? (
                        <p className="border border-dashed bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                            Tidak ada kelas pada filter ini.
                        </p>
                    ) : (
                        <ul className="grid gap-6 xl:grid-cols-2">
                            {visible.map((klass) => (
                                <ClassCard
                                    key={klass.id}
                                    klass={klass}
                                    options={options}
                                />
                            ))}
                        </ul>
                    )}
                </section>

                {proposals.length > 0 && (
                    <section
                        aria-labelledby="proposals-title"
                        className="space-y-3"
                    >
                        <h2
                            id="proposals-title"
                            className="text-h3 font-bold text-primary-700"
                        >
                            Pengajuan Saya
                        </h2>
                        <ul className="grid gap-3 lg:grid-cols-2">
                            {proposals.map((course) => (
                                <li
                                    key={course.id}
                                    className="space-y-3 border bg-card p-4"
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <p className="font-bold">
                                            <span className="font-mono">
                                                {course.code}
                                            </span>{' '}
                                            · {course.name}
                                        </p>
                                        <StatusBadge
                                            status={
                                                course.approvalStatus ===
                                                'rejected'
                                                    ? 'rejected'
                                                    : 'pending_approval'
                                            }
                                        />
                                    </div>
                                    <p className="text-sm">
                                        {course.credits} SKS · bobot{' '}
                                        <CourseWeights
                                            weights={course.weights}
                                        />
                                    </p>
                                    {course.rejectionReason && (
                                        <p className="flex gap-2 border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
                                            <MessageSquareWarning
                                                className="mt-0.5 size-4 shrink-0"
                                                aria-hidden
                                            />
                                            <span>
                                                <strong>
                                                    Alasan penolakan:
                                                </strong>{' '}
                                                {course.rejectionReason}
                                            </span>
                                        </p>
                                    )}
                                    {course.canEdit && (
                                        <CourseFormDialog
                                            action={CourseProposalController.update.form(
                                                course.id,
                                            )}
                                            title={`Revisi ${course.code}`}
                                            description="Revisi dikirim ulang ke Admin dengan status Menunggu Persetujuan."
                                            submitLabel="Kirim Ulang"
                                            course={course}
                                            trigger={
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    <Pencil />
                                                    {course.approvalStatus ===
                                                    'rejected'
                                                        ? 'Revisi & Ajukan Ulang'
                                                        : 'Ubah Pengajuan'}
                                                </Button>
                                            }
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </>
    );
}
