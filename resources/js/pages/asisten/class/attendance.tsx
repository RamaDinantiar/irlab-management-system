import { ClipboardCheck } from 'lucide-react';
import { ClassDetailLayout } from '@/components/classes/class-detail-layout';
import { EmptyState } from '@/components/empty-state';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { AttendanceStatus, ClassRow } from '@/types';

const CODE: Record<AttendanceStatus, { label: string; className: string }> = {
    hadir: { label: 'H', className: 'bg-success-soft text-success' },
    izin: { label: 'I', className: 'bg-primary-50 text-primary-700' },
    sakit: { label: 'S', className: 'bg-primary-50 text-primary-700' },
    alfa: { label: 'A', className: 'bg-danger-soft text-danger' },
};

type Student = {
    id: number;
    nim: string | null;
    name: string;
    statuses: Record<string, AttendanceStatus>;
};

/** Asisten › detail kelas › Presensi: rekap praktikan × pertemuan. */
export default function ClassAttendance({
    klass,
    meetings,
    students,
}: {
    klass: ClassRow;
    meetings: { id: number; number: number; date: string; started: boolean }[];
    students: Student[];
}) {
    return (
        <ClassDetailLayout klass={klass} title="Presensi">
            <p className="text-sm text-muted-foreground">
                H = Hadir · I = Izin · S = Sakit · A = Alfa. Isi presensi lewat
                tombol “Sesi” pada tab Pertemuan.
            </p>
            {meetings.length === 0 || students.length === 0 ? (
                <EmptyState
                    icon={ClipboardCheck}
                    title="Belum ada data presensi"
                    description="Buat pertemuan dan tambahkan anggota terlebih dahulu."
                />
            ) : (
                <div className="border">
                    <Table>
                        <caption className="sr-only">
                            Rekap presensi per pertemuan
                        </caption>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="sticky left-0 bg-primary-100">
                                    Praktikan
                                </TableHead>
                                {meetings.map((meeting) => (
                                    <TableHead
                                        key={meeting.id}
                                        className="text-center"
                                        title={formatDate(meeting.date)}
                                    >
                                        P{meeting.number}
                                    </TableHead>
                                ))}
                                <TableHead className="text-center">
                                    Hadir
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {students.map((student) => {
                                const present = Object.values(
                                    student.statuses,
                                ).filter((status) => status === 'hadir').length;

                                return (
                                    <TableRow key={student.id}>
                                        <TableCell className="sticky left-0 bg-white">
                                            <span className="block font-mono text-xs font-bold text-primary-700">
                                                {student.nim}
                                            </span>
                                            <span className="text-sm">
                                                {student.name}
                                            </span>
                                        </TableCell>
                                        {meetings.map((meeting) => {
                                            const status =
                                                student.statuses[meeting.id];

                                            return (
                                                <TableCell
                                                    key={meeting.id}
                                                    className="text-center"
                                                >
                                                    {status ? (
                                                        <span
                                                            className={cn(
                                                                'inline-flex size-7 items-center justify-center font-mono text-xs font-bold',
                                                                CODE[status]
                                                                    .className,
                                                            )}
                                                            title={status}
                                                        >
                                                            {CODE[status].label}
                                                        </span>
                                                    ) : (
                                                        <span
                                                            className="text-muted-foreground"
                                                            aria-label="Belum dicatat"
                                                        >
                                                            ·
                                                        </span>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell className="text-center font-mono font-bold">
                                            {present}/
                                            {
                                                meetings.filter(
                                                    (m) => m.started,
                                                ).length
                                            }
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </ClassDetailLayout>
    );
}
