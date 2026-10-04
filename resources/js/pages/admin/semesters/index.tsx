import { Head } from '@inertiajs/react';
import { CalendarRange, Pencil, Plus } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { ActivateSemesterDialog } from '@/components/semesters/activate-semester-dialog';
import { CopyStructureDialog } from '@/components/semesters/copy-structure-dialog';
import { PurgeSemesterDialog } from '@/components/semesters/purge-semester-dialog';
import { SemesterFormDialog } from '@/components/semesters/semester-form-dialog';
import type { Status } from '@/components/status-badge';
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
import { formatDateRange } from '@/lib/datetime';
import type { SemesterRow } from '@/types';

const STATUS: Record<SemesterRow['status'], Status> = {
    active: 'semester_active',
    draft: 'draft',
    archived: 'archived',
};

function Actions({
    semester,
    current,
    all,
}: {
    semester: SemesterRow;
    current: SemesterRow | undefined;
    all: SemesterRow[];
}) {
    return (
        <div className="flex flex-wrap items-center justify-end gap-2">
            {semester.status === 'draft' && (
                <ActivateSemesterDialog semester={semester} current={current} />
            )}
            {semester.canEdit && (
                <CopyStructureDialog
                    target={semester}
                    sources={all.filter((other) => other.id !== semester.id)}
                />
            )}
            {semester.canEdit && (
                <SemesterFormDialog
                    semester={semester}
                    trigger={
                        <Button size="sm" variant="outline">
                            <Pencil /> Ubah
                        </Button>
                    }
                />
            )}
            {semester.canPurge && <PurgeSemesterDialog semester={semester} />}
            {semester.status === 'archived' && !semester.canPurge && (
                <span className="text-xs text-muted-foreground">Read-only</span>
            )}
        </div>
    );
}

/** Admin › Semester (US-D01, FR-ADM-02). */
export default function SemestersIndex({
    semesters,
    purgeAfterYears,
}: {
    semesters: SemesterRow[];
    purgeAfterYears: number;
}) {
    const current = semesters.find((semester) => semester.status === 'active');

    return (
        <>
            <Head title="Semester" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Semester"
                    description="Data operasional (kelas, tugas, nilai) terpisah per semester. Hanya satu semester yang dapat aktif; semester sebelumnya otomatis diarsipkan."
                    actions={
                        <SemesterFormDialog
                            trigger={
                                <Button>
                                    <Plus /> Buat Semester
                                </Button>
                            }
                        />
                    }
                />

                {semesters.length === 0 ? (
                    <EmptyState
                        icon={CalendarRange}
                        title="Belum ada semester"
                        description="Buat semester pertama, lalu aktifkan agar kelas dan jadwal bisa mulai diatur."
                    />
                ) : (
                    <>
                        {current ? (
                            <section
                                aria-label="Semester aktif"
                                className="flex flex-col gap-1 bg-linear-to-r from-primary-900 to-primary p-5 text-white"
                            >
                                <p className="font-mono text-xs font-bold uppercase">
                                    Semester aktif
                                </p>
                                <p className="text-h2 font-bold">
                                    {current.name}
                                </p>
                                <p className="font-mono text-sm">
                                    {formatDateRange(
                                        current.startDate,
                                        current.endDate,
                                    )}
                                </p>
                            </section>
                        ) : (
                            <p
                                role="status"
                                className="border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
                            >
                                Belum ada semester aktif. Aktifkan salah satu
                                semester Draft agar data operasional dapat
                                dicatat.
                            </p>
                        )}

                        {/* Desktop & tablet: tabel */}
                        <div className="hidden border md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Semester</TableHead>
                                        <TableHead>Periode</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">
                                            Aksi
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {semesters.map((semester) => (
                                        <TableRow key={semester.id}>
                                            <TableCell className="font-bold">
                                                {semester.name}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {formatDateRange(
                                                    semester.startDate,
                                                    semester.endDate,
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge
                                                    status={
                                                        STATUS[semester.status]
                                                    }
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Actions
                                                    semester={semester}
                                                    current={current}
                                                    all={semesters}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Mobile: satu kartu per baris (PRD 7.3) */}
                        <ul className="grid gap-3 md:hidden">
                            {semesters.map((semester) => (
                                <li
                                    key={semester.id}
                                    className="space-y-3 border bg-card p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-bold">
                                                {semester.name}
                                            </p>
                                            <p className="font-mono text-xs">
                                                {formatDateRange(
                                                    semester.startDate,
                                                    semester.endDate,
                                                )}
                                            </p>
                                        </div>
                                        <StatusBadge
                                            status={STATUS[semester.status]}
                                        />
                                    </div>
                                    <Actions
                                        semester={semester}
                                        current={current}
                                        all={semesters}
                                    />
                                </li>
                            ))}
                        </ul>

                        <p className="text-xs text-muted-foreground">
                            Semester arsip bersifat read-only. Hapus permanen
                            hanya tersedia untuk arsip yang berakhir lebih dari{' '}
                            {purgeAfterYears} tahun lalu.
                        </p>
                    </>
                )}
            </div>
        </>
    );
}
