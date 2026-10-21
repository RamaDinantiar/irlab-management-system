import { Form, Link } from '@inertiajs/react';
import { CalendarPlus, Pencil, Play, Plus, Wand2 } from 'lucide-react';
import { useState } from 'react';
import MeetingController from '@/actions/App/Http/Controllers/Asisten/MeetingController';
import SessionController from '@/actions/App/Http/Controllers/Asisten/SessionController';
import { ClassDetailLayout } from '@/components/classes/class-detail-layout';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { MeetingFormDialog } from '@/components/meetings/meeting-form-dialog';
import { Badge } from '@/components/ui/badge';
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
import { Input } from '@/components/ui/input';
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
import { formatDate } from '@/lib/datetime';
import type { ClassRow, MeetingRow, SelectOption } from '@/types';

function GenerateDialog({ klass }: { klass: ClassRow }) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Wand2 /> Buat Otomatis
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Buat pertemuan otomatis</DialogTitle>
                    <DialogDescription>
                        Pertemuan mingguan dibuat mulai hari kelas pertama di
                        semester. Nomor yang sudah ada dilewati.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...MeetingController.generate.form(klass.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="grid gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="meeting-count">
                                    Jumlah pertemuan
                                </Label>
                                <Input
                                    id="meeting-count"
                                    name="count"
                                    type="number"
                                    min={1}
                                    max={20}
                                    defaultValue={8}
                                    required
                                    className="w-32"
                                />
                                <InputError message={errors.count} />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Batal
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />} Buat Pertemuan
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/** Asisten › detail kelas › Pertemuan (FR-AC-04). */
export default function ClassMeetings({
    klass,
    meetings,
    classAssistants,
}: {
    klass: ClassRow;
    meetings: MeetingRow[];
    classAssistants: SelectOption[];
}) {
    const nextNumber =
        Math.max(0, ...meetings.map((meeting) => meeting.number)) + 1;

    return (
        <ClassDetailLayout klass={klass} title="Pertemuan">
            {klass.canEdit && (
                <div className="flex flex-wrap gap-2">
                    <GenerateDialog klass={klass} />
                    <MeetingFormDialog
                        action={MeetingController.store.form(klass.id)}
                        nextNumber={nextNumber}
                        assistants={classAssistants}
                        trigger={
                            <Button>
                                <Plus /> Tambah Pertemuan
                            </Button>
                        }
                    />
                </div>
            )}

            {meetings.length === 0 ? (
                <EmptyState
                    icon={CalendarPlus}
                    title="Belum ada pertemuan"
                    description="Gunakan “Buat Otomatis” untuk membuat pertemuan mingguan sesuai jadwal kelas."
                />
            ) : (
                <div className="border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Materi</TableHead>
                                <TableHead>Penanggung Jawab</TableHead>
                                <TableHead>Sesi</TableHead>
                                <TableHead className="text-right">
                                    Aksi
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {meetings.map((meeting) => (
                                <TableRow key={meeting.id}>
                                    <TableCell className="font-mono font-bold">
                                        {String(meeting.number).padStart(
                                            2,
                                            '0',
                                        )}
                                    </TableCell>
                                    <TableCell className="font-mono text-sm whitespace-nowrap">
                                        {formatDate(meeting.date)}
                                    </TableCell>
                                    <TableCell className="min-w-56 font-bold whitespace-normal">
                                        {meeting.topic ?? '—'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {meeting.responsibleAssistant?.name ??
                                            '—'}
                                    </TableCell>
                                    <TableCell>
                                        {meeting.startedAt ? (
                                            <Badge variant="success">
                                                Dimulai ·{' '}
                                                {meeting.attendanceCount}{' '}
                                                presensi
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline">
                                                Belum
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                            >
                                                <Link
                                                    href={SessionController.show.url(
                                                        meeting.id,
                                                    )}
                                                >
                                                    <Play /> Sesi
                                                </Link>
                                            </Button>
                                            {klass.canEdit && (
                                                <>
                                                    <MeetingFormDialog
                                                        action={MeetingController.update.form(
                                                            meeting.id,
                                                        )}
                                                        meeting={meeting}
                                                        assistants={
                                                            classAssistants
                                                        }
                                                        trigger={
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                aria-label={`Ubah pertemuan ${meeting.number}`}
                                                            >
                                                                <Pencil />
                                                            </Button>
                                                        }
                                                    />
                                                    {!meeting.startedAt && (
                                                        <ConfirmDeleteDialog
                                                            action={MeetingController.destroy.form(
                                                                meeting.id,
                                                            )}
                                                            title={`Hapus pertemuan ${meeting.number}?`}
                                                            description="Pertemuan ini akan dihapus."
                                                        />
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </ClassDetailLayout>
    );
}
