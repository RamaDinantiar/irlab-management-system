import { Head } from '@inertiajs/react';
import { Library, Pencil, Plus } from 'lucide-react';
import CourseController from '@/actions/App/Http/Controllers/Admin/CourseController';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { CourseFormDialog } from '@/components/courses/course-form-dialog';
import { CourseWeights } from '@/components/courses/course-weights';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { ReviewActions } from '@/components/review-actions';
import { SemesterPicker } from '@/components/semester-picker';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useNow } from '@/hooks/use-now';
import { formatRelative } from '@/lib/datetime';
import type { AssistantOption, CourseRow, SemesterOption } from '@/types';

type Props = {
    semesters: SemesterOption[];
    semester: (SemesterOption & { editable: boolean }) | null;
    courses: CourseRow[];
    pending: CourseRow[];
    assistants: AssistantOption[];
};

function AssistantNames({ course }: { course: CourseRow }) {
    if (!course.assistants?.length) {
        return (
            <span className="text-sm text-muted-foreground">
                Belum ditetapkan
            </span>
        );
    }

    return (
        <span className="text-sm">
            {course.assistants.map((a) => a.name).join(', ')}
        </span>
    );
}

/** Admin › Mata Kuliah (US-D02, FR-ADM-03). */
export default function CoursesIndex({
    semesters,
    semester,
    courses,
    pending,
    assistants,
}: Props) {
    const now = useNow();
    const editable = semester?.editable ?? false;

    const actions = (course: CourseRow) =>
        course.canEdit && (
            <div className="flex flex-wrap justify-end gap-2">
                <CourseFormDialog
                    action={CourseController.update.form(course.id)}
                    title={`Ubah ${course.code}`}
                    description="Perubahan bobot berlaku untuk perhitungan nilai akhir mata kuliah ini."
                    submitLabel="Simpan Perubahan"
                    course={course}
                    assistants={assistants}
                    trigger={
                        <Button size="sm" variant="outline">
                            <Pencil /> Ubah
                        </Button>
                    }
                />
                <ConfirmDeleteDialog
                    action={CourseController.destroy.form(course.id)}
                    title={`Hapus ${course.code} ${course.name}?`}
                    description="Mata kuliah dan penugasan asistennya akan dihapus dari semester ini."
                />
            </div>
        );

    return (
        <>
            <Head title="Mata Kuliah" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Mata Kuliah"
                    description="Kode, SKS, bobot nilai (Pre-test · Post-test · Laporan = 100%), dan asisten pengampu per semester."
                    actions={
                        semester &&
                        editable && (
                            <CourseFormDialog
                                action={CourseController.store.form()}
                                title="Tambah Mata Kuliah"
                                description={`Ditambahkan ke ${semester.name} dan langsung berstatus disetujui.`}
                                submitLabel="Tambah"
                                semesterId={semester.id}
                                assistants={assistants}
                                trigger={
                                    <Button>
                                        <Plus /> Tambah Mata Kuliah
                                    </Button>
                                }
                            />
                        )
                    }
                />

                {semesters.length === 0 || !semester ? (
                    <EmptyState
                        icon={Library}
                        title="Belum ada semester"
                        description="Buat dan aktifkan semester terlebih dahulu di menu Semester."
                    />
                ) : (
                    <>
                        <SemesterPicker
                            semesters={semesters}
                            current={semester}
                            url={(value) =>
                                CourseController.index.url({
                                    query: { semester: value },
                                })
                            }
                        />

                        {pending.length > 0 && (
                            <section
                                aria-labelledby="pending-title"
                                className="border border-warning/40 bg-card"
                            >
                                <h2
                                    id="pending-title"
                                    className="border-b border-warning/40 bg-warning-soft px-5 py-3 font-bold text-warning"
                                >
                                    {pending.length} pengajuan menunggu
                                    persetujuan
                                </h2>
                                <ul className="divide-y divide-primary-50">
                                    {pending.map((course) => (
                                        <li
                                            key={course.id}
                                            className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
                                        >
                                            <div className="space-y-1">
                                                <p className="font-bold">
                                                    <span className="font-mono">
                                                        {course.code}
                                                    </span>{' '}
                                                    · {course.name}
                                                </p>
                                                <p className="text-sm">
                                                    {course.credits} SKS · bobot{' '}
                                                    <CourseWeights
                                                        weights={course.weights}
                                                    />
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Diajukan {course.proposedBy}
                                                    {course.proposedAt &&
                                                        ` · ${formatRelative(course.proposedAt, now)}`}
                                                </p>
                                            </div>
                                            {editable && (
                                                <ReviewActions
                                                    name={course.name}
                                                    proposedBy={
                                                        course.proposedBy
                                                    }
                                                    approveAction={CourseController.approve.form(
                                                        course.id,
                                                    )}
                                                    rejectAction={CourseController.reject.form(
                                                        course.id,
                                                    )}
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {courses.length === 0 ? (
                            <EmptyState
                                icon={Library}
                                title={`Belum ada mata kuliah di ${semester.name}`}
                                description="Tambahkan mata kuliah, atau salin struktur dari semester sebelumnya di menu Semester."
                            />
                        ) : (
                            <>
                                <div className="hidden border md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Kode</TableHead>
                                                <TableHead>
                                                    Mata Kuliah
                                                </TableHead>
                                                <TableHead>SKS</TableHead>
                                                <TableHead>
                                                    Bobot{' '}
                                                    <span className="sr-only">
                                                        pre · post · laporan
                                                    </span>
                                                    <span
                                                        aria-hidden
                                                        className="block text-xs font-normal"
                                                    >
                                                        Pre · Post · Lap
                                                    </span>
                                                </TableHead>
                                                <TableHead>
                                                    Asisten Pengampu
                                                </TableHead>
                                                <TableHead className="text-right">
                                                    Aksi
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {courses.map((course) => (
                                                <TableRow key={course.id}>
                                                    <TableCell className="font-mono font-bold text-primary-700">
                                                        {course.code}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="font-bold">
                                                            {course.name}
                                                        </span>
                                                        {course.approvalStatus ===
                                                            'rejected' && (
                                                            <span className="mt-1 block">
                                                                <StatusBadge status="rejected" />
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-mono">
                                                        {course.credits}
                                                    </TableCell>
                                                    <TableCell>
                                                        <CourseWeights
                                                            weights={
                                                                course.weights
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell className="max-w-64 whitespace-normal">
                                                        <AssistantNames
                                                            course={course}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {actions(course)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <ul className="grid gap-3 md:hidden">
                                    {courses.map((course) => (
                                        <li
                                            key={course.id}
                                            className="space-y-2 border bg-card p-4"
                                        >
                                            <p className="font-mono text-sm font-bold text-primary-700">
                                                {course.code} · {course.credits}{' '}
                                                SKS
                                            </p>
                                            <p className="font-bold">
                                                {course.name}
                                            </p>
                                            <p className="text-sm">
                                                Bobot{' '}
                                                <CourseWeights
                                                    weights={course.weights}
                                                />
                                            </p>
                                            <AssistantNames course={course} />
                                            {actions(course)}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
