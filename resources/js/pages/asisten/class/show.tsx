import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, UserMinus, Users } from 'lucide-react';
import { useState } from 'react';
import ClassAccessController from '@/actions/App/Http/Controllers/Asisten/ClassAccessController';
import MemberController from '@/actions/App/Http/Controllers/Asisten/MemberController';
import { ClassAccess } from '@/components/classes/class-access';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/datetime';
import { formatSchedule } from '@/lib/days';
import type { ClassRow } from '@/types';

type Member = {
    id: number;
    nim: string | null;
    name: string;
    email: string;
    major: string | null;
    cohortYear: number | null;
    joinedAt: string;
};

/** FR-ENR-04: keluarkan praktikan dengan alasan; submission tetap tersimpan. */
function RemoveMemberDialog({
    klass,
    member,
}: {
    klass: ClassRow;
    member: Member;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger-soft hover:text-danger"
                >
                    <UserMinus /> Keluarkan
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Keluarkan {member.name}?</DialogTitle>
                    <DialogDescription>
                        {member.name} tidak lagi melihat jadwal & tugas{' '}
                        {klass.name}. Submission dan nilai yang sudah ada tetap
                        tersimpan.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...MemberController.destroy.form({
                        class: klass.id,
                        enrollment: member.id,
                    })}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="grid gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor={`remove-reason-${member.id}`}>
                                    Alasan
                                </Label>
                                <Textarea
                                    id={`remove-reason-${member.id}`}
                                    name="reason"
                                    required
                                    minLength={5}
                                    maxLength={500}
                                    placeholder="Contoh: Salah kelas, pindah ke Kelas B."
                                    aria-invalid={!!errors.reason}
                                />
                                <InputError message={errors.reason} />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Batal
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    variant="destructive"
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    Keluarkan
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Asisten › detail kelas (FR-AC-02/03). Tab Anggota; Pertemuan & Modul,
 * Presensi, dan Kursi menyusul bersama modulnya.
 */
export default function AsistenClassShow({
    klass,
    members,
}: {
    klass: ClassRow;
    members: Member[];
}) {
    return (
        <>
            <Head title={`${klass.course?.name} · ${klass.name}`} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <Link
                    href="/asisten/class"
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
                >
                    <ArrowLeft className="size-4" aria-hidden /> Semua kelas
                </Link>
                <PageHeader
                    title={`${klass.course?.name} · ${klass.name}`}
                    description={`${formatSchedule(klass.dayOfWeek, klass.startTime, klass.endTime)} · ${klass.room?.name} · ${klass.membersCount}/${klass.quota} praktikan`}
                    actions={
                        <ClassAccess
                            klass={klass}
                            tokenAction={ClassAccessController.regenerateToken.form(
                                klass.id,
                            )}
                            lockAction={ClassAccessController.lock.form(
                                klass.id,
                            )}
                        />
                    }
                />

                <nav
                    aria-label="Bagian kelas"
                    className="flex flex-wrap gap-1 border-b border-primary-200"
                >
                    <span
                        aria-current="page"
                        className="border-b-2 border-primary-700 px-4 py-2 text-sm font-bold text-primary-700"
                    >
                        Anggota ({members.length})
                    </span>
                    {[
                        'Pertemuan & Modul',
                        'Presensi',
                        'Kursi',
                        'Pengaturan',
                    ].map((tab) => (
                        <span
                            key={tab}
                            className="px-4 py-2 text-sm text-muted-foreground"
                            title="Segera hadir bersama modulnya"
                        >
                            {tab}
                        </span>
                    ))}
                </nav>

                {klass.isLocked && (
                    <p className="flex items-center gap-2 text-sm">
                        <StatusBadge status="locked" /> Praktikan baru tidak
                        dapat bergabung; anggota lama tidak terpengaruh.
                    </p>
                )}

                {members.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="Belum ada anggota"
                        description={
                            klass.joinToken
                                ? `Bagikan kode ${klass.joinToken} ke praktikan agar mereka dapat bergabung.`
                                : 'Token dibuat setelah kelas disetujui Admin.'
                        }
                    />
                ) : (
                    <>
                        <div className="hidden border md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>NIM</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Jurusan</TableHead>
                                        <TableHead>Bergabung</TableHead>
                                        <TableHead className="text-right">
                                            Aksi
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {members.map((member) => (
                                        <TableRow key={member.id}>
                                            <TableCell className="font-mono font-bold text-primary-700">
                                                {member.nim ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                <span className="block font-bold">
                                                    {member.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {member.email}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {member.major ?? '—'}
                                                {member.cohortYear &&
                                                    ` · ${member.cohortYear}`}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {formatDate(
                                                    member.joinedAt.slice(
                                                        0,
                                                        10,
                                                    ),
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {klass.canEdit && (
                                                    <RemoveMemberDialog
                                                        klass={klass}
                                                        member={member}
                                                    />
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <ul className="grid gap-3 md:hidden">
                            {members.map((member) => (
                                <li
                                    key={member.id}
                                    className="flex items-start justify-between gap-3 border bg-card p-4"
                                >
                                    <div>
                                        <p className="font-mono text-sm font-bold text-primary-700">
                                            {member.nim}
                                        </p>
                                        <p className="font-bold">
                                            {member.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {member.major}
                                        </p>
                                    </div>
                                    {klass.canEdit && (
                                        <RemoveMemberDialog
                                            klass={klass}
                                            member={member}
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </>
    );
}
