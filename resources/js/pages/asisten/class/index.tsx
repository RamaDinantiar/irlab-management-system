import { Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    CalendarPlus,
    FilePlus2,
    MessageSquareWarning,
    Pencil,
    School,
    Users,
} from 'lucide-react';
import ClassAccessController from '@/actions/App/Http/Controllers/Asisten/ClassAccessController';
import ClassProposalController from '@/actions/App/Http/Controllers/Asisten/ClassProposalController';
import CourseProposalController from '@/actions/App/Http/Controllers/Asisten/CourseProposalController';
import ClassDetailController from '@/actions/App/Http/Controllers/Asisten/ClassDetailController';
import { ClassAccess } from '@/components/classes/class-access';
import { ClassFormDialog } from '@/components/classes/class-form-dialog';
import { CourseFormDialog } from '@/components/courses/course-form-dialog';
import { CourseWeights } from '@/components/courses/course-weights';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import type { Status } from '@/components/status-badge';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { formatSchedule } from '@/lib/days';
import { Button } from '@/components/ui/button';
import type { ClassRow, CourseRow, SelectOption } from '@/types';

type Props = {
    semester: { id: number; name: string } | null;
    classes: ClassRow[];
    courses: CourseRow[];
    proposals: CourseRow[];
    options: { courses: SelectOption[]; rooms: SelectOption[] };
};

const CLASS_STATUS: Record<ClassRow['approvalStatus'], Status> = {
    approved: 'approved',
    pending: 'pending_approval',
    rejected: 'rejected',
};

/**
 * Asisten › Class (FR-AC-01, FR-AS-02, US-A01): kartu kelas yang diampu
 * (token, lock, anggota/kuota), mata kuliah yang diampu, dan pengajuan.
 * Detail kelas (anggota, pertemuan, presensi) menyusul.
 */
export default function AsistenClassIndex({
    semester,
    classes,
    courses,
    proposals,
    options,
}: Props) {
    return (
        <>
            <Head title="Class" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Class"
                    description={
                        semester
                            ? `Mata kuliah yang Anda ampu pada ${semester.name}.`
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

                <section aria-labelledby="classes-title" className="space-y-3">
                    <h2
                        id="classes-title"
                        className="text-h3 font-bold text-primary-700"
                    >
                        Kelas Saya
                    </h2>
                    {classes.length === 0 ? (
                        <EmptyState
                            icon={School}
                            title="Belum ada kelas"
                            description="Ajukan kelas untuk mata kuliah yang Anda ampu, atau minta Admin menugaskan Anda."
                        />
                    ) : (
                        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {classes.map((klass) => (
                                <li
                                    key={klass.id}
                                    className="flex flex-col gap-3 border bg-card p-5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <Badge>{klass.course?.code}</Badge>
                                        <div className="flex flex-wrap gap-1.5">
                                            {klass.isLocked && (
                                                <StatusBadge status="locked" />
                                            )}
                                            <StatusBadge
                                                status={
                                                    CLASS_STATUS[
                                                        klass.approvalStatus
                                                    ]
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-h3 font-bold text-primary-700">
                                            {klass.course?.name}
                                        </p>
                                        <p className="font-bold">
                                            {klass.name}
                                        </p>
                                    </div>
                                    <p className="font-mono text-sm">
                                        {formatSchedule(
                                            klass.dayOfWeek,
                                            klass.startTime,
                                            klass.endTime,
                                        )}{' '}
                                        · {klass.room?.name}
                                    </p>
                                    <p className="text-sm">
                                        Anggota{' '}
                                        <span className="font-mono font-bold">
                                            {klass.membersCount}/{klass.quota}
                                        </span>
                                    </p>
                                    {klass.rejectionReason && (
                                        <p className="flex gap-2 border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
                                            <MessageSquareWarning
                                                className="mt-0.5 size-4 shrink-0"
                                                aria-hidden
                                            />
                                            <span>
                                                <strong>
                                                    Alasan penolakan:
                                                </strong>{' '}
                                                {klass.rejectionReason}
                                            </span>
                                        </p>
                                    )}
                                    <div className="mt-auto space-y-3 border-t pt-3">
                                        {klass.approvalStatus ===
                                            'approved' && (
                                            <Link
                                                href={ClassDetailController.members.url(
                                                    klass.id,
                                                )}
                                                prefetch
                                                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-700 underline decoration-primary-200 underline-offset-4 hover:decoration-current"
                                            >
                                                <Users
                                                    className="size-4"
                                                    aria-hidden
                                                />{' '}
                                                Lihat Anggota
                                            </Link>
                                        )}
                                        <ClassAccess
                                            klass={klass}
                                            tokenAction={ClassAccessController.regenerateToken.form(
                                                klass.id,
                                            )}
                                            lockAction={ClassAccessController.lock.form(
                                                klass.id,
                                            )}
                                        />
                                        {klass.canEdit && (
                                            <ClassFormDialog
                                                action={ClassProposalController.update.form(
                                                    klass.id,
                                                )}
                                                title={`Ubah jadwal ${klass.name}`}
                                                description={
                                                    klass.approvalStatus ===
                                                    'approved'
                                                        ? 'Kelas sudah aktif: perubahan jadwal tidak memerlukan persetujuan ulang.'
                                                        : 'Revisi dikirim ulang ke Admin.'
                                                }
                                                submitLabel="Simpan"
                                                klass={klass}
                                                courses={options.courses}
                                                rooms={options.rooms}
                                                trigger={
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        <Pencil /> Ubah Jadwal
                                                    </Button>
                                                }
                                            />
                                        )}
                                    </div>
                                </li>
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

                <section aria-labelledby="courses-title" className="space-y-3">
                    <h2
                        id="courses-title"
                        className="text-h3 font-bold text-primary-700"
                    >
                        Mata Kuliah yang Diampu
                    </h2>
                    {courses.length === 0 ? (
                        <EmptyState
                            icon={BookOpen}
                            title="Belum ada mata kuliah"
                            description="Admin belum menugaskan Anda ke mata kuliah. Anda juga dapat mengajukan mata kuliah baru."
                        />
                    ) : (
                        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {courses.map((course) => (
                                <li
                                    key={course.id}
                                    className="flex flex-col gap-3 border bg-card p-5"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <Badge>{course.code}</Badge>
                                        <span className="font-mono text-sm">
                                            {course.credits} SKS
                                        </span>
                                    </div>
                                    <p className="text-h3 font-bold text-primary-700">
                                        {course.name}
                                    </p>
                                    <p className="text-sm">
                                        Bobot pre · post · laporan:{' '}
                                        <CourseWeights
                                            weights={course.weights}
                                        />
                                    </p>
                                    <p className="mt-auto border-t pt-3 text-xs text-muted-foreground">
                                        Pengampu:{' '}
                                        {course.assistants
                                            ?.map((a) => a.name)
                                            .join(', ')}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </>
    );
}
