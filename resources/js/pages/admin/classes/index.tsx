import { Head } from '@inertiajs/react';
import { Pencil, Plus, School } from 'lucide-react';
import ClassController from '@/actions/App/Http/Controllers/Admin/ClassController';
import { ClassAccess } from '@/components/classes/class-access';
import { ClassFormDialog } from '@/components/classes/class-form-dialog';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
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
import { formatSchedule } from '@/lib/days';
import type {
    AssistantOption,
    ClassRow,
    SelectOption,
    SemesterOption,
} from '@/types';

type Props = {
    semesters: SemesterOption[];
    semester: (SemesterOption & { editable: boolean }) | null;
    classes: ClassRow[];
    pending: ClassRow[];
    options: {
        courses: SelectOption[];
        rooms: SelectOption[];
        assistants: AssistantOption[];
    };
};

/** Admin › Kelas & Jadwal (FR-ADM-04, US-D02-2/3, US-A01). */
export default function ClassesIndex({
    semesters,
    semester,
    classes,
    pending,
    options,
}: Props) {
    const now = useNow();
    const editable = semester?.editable ?? false;

    const actions = (klass: ClassRow) =>
        klass.canEdit && (
            <div className="flex flex-wrap justify-end gap-2">
                <ClassFormDialog
                    action={ClassController.update.form(klass.id)}
                    title={`Ubah ${klass.course?.name} · ${klass.name}`}
                    description="Perubahan jadwal dicek ulang terhadap bentrok ruang & asisten."
                    submitLabel="Simpan Perubahan"
                    klass={klass}
                    courses={options.courses}
                    rooms={options.rooms}
                    assistants={options.assistants}
                    trigger={
                        <Button size="sm" variant="outline">
                            <Pencil /> Ubah
                        </Button>
                    }
                />
                <ConfirmDeleteDialog
                    action={ClassController.destroy.form(klass.id)}
                    title={`Hapus ${klass.course?.name} · ${klass.name}?`}
                    description="Kelas, token, dan penugasan asistennya dihapus."
                />
            </div>
        );

    return (
        <>
            <Head title="Kelas & Jadwal" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Kelas & Jadwal"
                    description="Kelas praktikum per mata kuliah: jadwal, ruang, kuota, asisten pengampu, dan token gabung. Jadwal yang bentrok di ruang yang sama ditolak otomatis."
                    actions={
                        semester &&
                        editable && (
                            <ClassFormDialog
                                action={ClassController.store.form()}
                                title="Tambah Kelas"
                                description={`Ditambahkan ke ${semester.name}; token dibuat otomatis.`}
                                submitLabel="Tambah Kelas"
                                semesterId={semester.id}
                                courses={options.courses}
                                rooms={options.rooms}
                                assistants={options.assistants}
                                trigger={
                                    <Button>
                                        <Plus /> Tambah Kelas
                                    </Button>
                                }
                            />
                        )
                    }
                />

                {!semester ? (
                    <EmptyState
                        icon={School}
                        title="Belum ada semester"
                        description="Buat dan aktifkan semester terlebih dahulu."
                    />
                ) : (
                    <>
                        <SemesterPicker
                            semesters={semesters}
                            current={semester}
                            url={(value) =>
                                ClassController.index.url({
                                    query: { semester: value },
                                })
                            }
                        />

                        {pending.length > 0 && (
                            <section
                                aria-labelledby="pending-classes"
                                className="border border-warning/40 bg-card"
                            >
                                <h2
                                    id="pending-classes"
                                    className="border-b border-warning/40 bg-warning-soft px-5 py-3 font-bold text-warning"
                                >
                                    {pending.length} kelas menunggu persetujuan
                                </h2>
                                <ul className="divide-y divide-primary-50">
                                    {pending.map((klass) => (
                                        <li
                                            key={klass.id}
                                            className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
                                        >
                                            <div className="space-y-1">
                                                <p className="font-bold">
                                                    {klass.course?.name} ·{' '}
                                                    {klass.name}
                                                </p>
                                                <p className="font-mono text-sm">
                                                    {formatSchedule(
                                                        klass.dayOfWeek,
                                                        klass.startTime,
                                                        klass.endTime,
                                                    )}{' '}
                                                    · {klass.room?.name} · kuota{' '}
                                                    {klass.quota}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Diajukan {klass.proposedBy}
                                                    {klass.proposedAt &&
                                                        ` · ${formatRelative(klass.proposedAt, now)}`}
                                                </p>
                                            </div>
                                            {editable && (
                                                <ReviewActions
                                                    name={`${klass.course?.name} · ${klass.name}`}
                                                    proposedBy={
                                                        klass.proposedBy
                                                    }
                                                    approveAction={ClassController.approve.form(
                                                        klass.id,
                                                    )}
                                                    rejectAction={ClassController.reject.form(
                                                        klass.id,
                                                    )}
                                                />
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {classes.length === 0 ? (
                            <EmptyState
                                icon={School}
                                title={`Belum ada kelas di ${semester.name}`}
                                description={
                                    options.courses.length === 0
                                        ? 'Tambahkan mata kuliah terlebih dahulu di menu Mata Kuliah.'
                                        : 'Tambahkan kelas untuk mulai membagikan token ke praktikan.'
                                }
                            />
                        ) : (
                            <>
                                <div className="hidden border lg:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>
                                                    Mata Kuliah · Kelas
                                                </TableHead>
                                                <TableHead>Jadwal</TableHead>
                                                <TableHead>Ruang</TableHead>
                                                <TableHead>Anggota</TableHead>
                                                <TableHead>Asisten</TableHead>
                                                <TableHead>Token</TableHead>
                                                <TableHead className="text-right">
                                                    Aksi
                                                </TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {classes.map((klass) => (
                                                <TableRow key={klass.id}>
                                                    <TableCell>
                                                        <span className="block font-bold">
                                                            {klass.course?.name}
                                                        </span>
                                                        <span className="text-sm">
                                                            {klass.name}
                                                        </span>
                                                        {klass.approvalStatus ===
                                                            'rejected' && (
                                                            <StatusBadge
                                                                status="rejected"
                                                                className="mt-1"
                                                            />
                                                        )}
                                                        {klass.isLocked && (
                                                            <StatusBadge
                                                                status="locked"
                                                                className="mt-1"
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">
                                                        {formatSchedule(
                                                            klass.dayOfWeek,
                                                            klass.startTime,
                                                            klass.endTime,
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="whitespace-nowrap">
                                                        {klass.room?.name}
                                                    </TableCell>
                                                    <TableCell className="font-mono">
                                                        {klass.membersCount}/
                                                        {klass.quota}
                                                    </TableCell>
                                                    <TableCell className="max-w-48 text-sm whitespace-normal">
                                                        {klass.assistants
                                                            ?.map((a) => a.name)
                                                            .join(', ') || '—'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <ClassAccess
                                                            klass={klass}
                                                            tokenAction={ClassController.regenerateToken.form(
                                                                klass.id,
                                                            )}
                                                            lockAction={ClassController.lock.form(
                                                                klass.id,
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        {actions(klass)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <ul className="grid gap-3 md:grid-cols-2 lg:hidden">
                                    {classes.map((klass) => (
                                        <li
                                            key={klass.id}
                                            className="space-y-3 border bg-card p-4"
                                        >
                                            <div>
                                                <p className="font-bold">
                                                    {klass.course?.name} ·{' '}
                                                    {klass.name}
                                                </p>
                                                <p className="font-mono text-sm">
                                                    {formatSchedule(
                                                        klass.dayOfWeek,
                                                        klass.startTime,
                                                        klass.endTime,
                                                    )}{' '}
                                                    · {klass.room?.name}
                                                </p>
                                                <p className="text-sm">
                                                    Anggota {klass.membersCount}
                                                    /{klass.quota} ·{' '}
                                                    {klass.assistants
                                                        ?.map((a) => a.name)
                                                        .join(', ')}
                                                </p>
                                            </div>
                                            <ClassAccess
                                                klass={klass}
                                                tokenAction={ClassController.regenerateToken.form(
                                                    klass.id,
                                                )}
                                                lockAction={ClassController.lock.form(
                                                    klass.id,
                                                )}
                                            />
                                            {actions(klass)}
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
