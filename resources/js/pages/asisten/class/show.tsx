import { Form } from '@inertiajs/react';
import { Download, UserMinus, Users } from 'lucide-react';
import { useState } from 'react';
import ClassDetailController from '@/actions/App/Http/Controllers/Asisten/ClassDetailController';
import { ClassDetailLayout } from '@/components/classes/class-detail-layout';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { ImportUsersDialog } from '@/components/users/import-users-dialog';
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
import type { ClassRow } from '@/types';

type Member = {
    id: number;
    nim: string | null;
    name: string;
    email: string;
    major: string | null;
    cohortYear: number | null;
    joinedAt: string;
    seat: string | null;
    average: number | null;
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
                    {...ClassDetailController.removeMember.form({
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
 * Asisten › detail kelas › Anggota (FR-AC-03): NIM, nama, jurusan, kursi,
 * rata-rata nilai; keluarkan, ekspor Excel, import praktikan.
 */
export default function AsistenClassShow({
    klass,
    members,
}: {
    klass: ClassRow;
    members: Member[];
}) {
    return (
        <ClassDetailLayout klass={klass} title="Anggota">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                    {members.length} praktikan ·{' '}
                    {members.filter((m) => m.seat).length} sudah mengontrak
                    kursi
                </p>
                <div className="flex flex-wrap gap-2">
                    {klass.canEdit && (
                        <ImportUsersDialog
                            action={ClassDetailController.importMembers.form(
                                klass.id,
                            )}
                            title="Import praktikan ke kelas"
                            triggerLabel="Import ke Kelas"
                            templateUrl={null}
                            description={
                                <>
                                    CSV atau XLSX dengan kolom{' '}
                                    <span className="font-mono">nim</span>. Akun
                                    praktikan harus sudah dibuat Admin; baris
                                    yang gagal dilaporkan.
                                </>
                            }
                        />
                    )}
                    {members.length > 0 && (
                        <Button variant="outline" asChild>
                            <a
                                href={ClassDetailController.exportMembers.url(
                                    klass.id,
                                )}
                            >
                                <Download /> Ekspor Excel
                            </a>
                        </Button>
                    )}
                </div>
            </div>
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
                                    <TableHead>Kursi</TableHead>
                                    <TableHead>Rata-rata Nilai</TableHead>
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
                                            {member.seat ?? '—'}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm font-bold">
                                            {member.average ?? '—'}
                                        </TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {formatDate(
                                                member.joinedAt.slice(0, 10),
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
                                    <p className="font-bold">{member.name}</p>
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
        </ClassDetailLayout>
    );
}
