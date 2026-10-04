import { Form, Head, Link } from '@inertiajs/react';
import { LayoutGrid, Pencil, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import RoomController from '@/actions/App/Http/Controllers/Admin/RoomController';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
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
import type { RoomRow } from '@/types';

function RoomFormDialog({
    room,
    trigger,
}: {
    room?: RoomRow;
    trigger: ReactNode;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {room ? `Ubah ${room.name}` : 'Tambah Ruang'}
                    </DialogTitle>
                    <DialogDescription>
                        Ukuran grid denah (baris × kolom). Penempatan kursi,
                        meja asisten, dan lorong diatur di editor denah.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...(room
                        ? RoomController.update.form(room.id)
                        : RoomController.store.form())}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="grid gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="room-name">Nama ruang</Label>
                                <Input
                                    id="room-name"
                                    name="name"
                                    required
                                    maxLength={50}
                                    defaultValue={room?.name}
                                    placeholder="Lab IR 1"
                                />
                                <InputError message={errors.name} />
                            </div>
                            <div className="grid grid-cols-2 gap-5">
                                <div className="grid gap-2">
                                    <Label htmlFor="room-rows">Baris</Label>
                                    <Input
                                        id="room-rows"
                                        name="rows"
                                        type="number"
                                        min={1}
                                        max={20}
                                        required
                                        defaultValue={room?.rows ?? 6}
                                    />
                                    <InputError message={errors.rows} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="room-cols">Kolom</Label>
                                    <Input
                                        id="room-cols"
                                        name="cols"
                                        type="number"
                                        min={1}
                                        max={20}
                                        required
                                        defaultValue={room?.cols ?? 8}
                                    />
                                    <InputError message={errors.cols} />
                                </div>
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Batal
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    {room ? 'Simpan Perubahan' : 'Tambah Ruang'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/** Admin › Ruang & Denah (FR-ADM-05). */
export default function RoomsIndex({
    rooms,
    errors,
}: {
    rooms: RoomRow[];
    errors?: { room?: string };
}) {
    return (
        <>
            <Head title="Ruang & Denah" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Ruang & Denah"
                    description="Ruang lab yang dipakai kelas praktikum beserta denah kursinya (kursi, meja asisten, lorong)."
                    actions={
                        <RoomFormDialog
                            trigger={
                                <Button>
                                    <Plus /> Tambah Ruang
                                </Button>
                            }
                        />
                    }
                />
                <InputError message={errors?.room} />
                {rooms.length === 0 ? (
                    <EmptyState
                        icon={LayoutGrid}
                        title="Belum ada ruang"
                        description="Tambahkan ruang lab agar kelas dapat dijadwalkan."
                    />
                ) : (
                    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {rooms.map((room) => (
                            <li
                                key={room.id}
                                className="flex flex-col gap-3 border bg-card p-5"
                            >
                                <p className="text-h3 font-bold text-primary-700">
                                    {room.name}
                                </p>
                                <p className="font-mono text-sm">
                                    Grid {room.rows} × {room.cols} ·{' '}
                                    {room.classesCount} kelas ·{' '}
                                    {room.seatsCount} kursi
                                </p>
                                <div className="mt-auto flex flex-wrap gap-2">
                                    <Button size="sm" asChild>
                                        <Link
                                            href={RoomController.layout.url(
                                                room.id,
                                            )}
                                        >
                                            <LayoutGrid /> Edit Denah
                                        </Link>
                                    </Button>
                                    <RoomFormDialog
                                        room={room}
                                        trigger={
                                            <Button size="sm" variant="outline">
                                                <Pencil /> Ubah
                                            </Button>
                                        }
                                    />
                                    {room.classesCount === 0 && (
                                        <ConfirmDeleteDialog
                                            action={RoomController.destroy.form(
                                                room.id,
                                            )}
                                            title={`Hapus ${room.name}?`}
                                            description="Ruang yang tidak dipakai kelas mana pun akan dihapus."
                                        />
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
