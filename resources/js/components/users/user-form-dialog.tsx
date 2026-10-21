import { Form } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import InputError from '@/components/input-error';
import { positionLabels } from '@/config/navigation';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type { Position, Role, UserRow } from '@/types';

/** US-D04: buat/ubah akun, peran, dan jabatan (divisi Asisten Umum / Sekretaris/Bendahara). */
export function UserFormDialog({
    user,
    trigger,
}: {
    user?: UserRow;
    trigger: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const [role, setRole] = useState<Role>(user?.role ?? 'praktikan');
    const [position, setPosition] = useState<Position>(
        user?.position ?? 'none',
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                setRole(user?.role ?? 'praktikan');
                setPosition(user?.position ?? 'none');
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        {user ? `Ubah ${user.name}` : 'Tambah Pengguna'}
                    </DialogTitle>
                    <DialogDescription>
                        {user
                            ? 'Perubahan peran dan jabatan tercatat di audit log.'
                            : 'Password sementara dibuat otomatis dan dikirim ke email pengguna.'}
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...(user
                        ? UserController.update.form(user.id)
                        : UserController.store.form())}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="grid gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="user-role">Peran</Label>
                                    <Select
                                        name="role"
                                        value={role}
                                        onValueChange={(value) => {
                                            setRole(value as Role);
                                            if (value !== 'asisten') {
                                                setPosition('none');
                                            }
                                        }}
                                        disabled={user?.isSelf}
                                    >
                                        <SelectTrigger
                                            id="user-role"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="praktikan">
                                                Praktikan
                                            </SelectItem>
                                            <SelectItem value="asisten">
                                                Asisten Lab
                                            </SelectItem>
                                            <SelectItem value="admin">
                                                Admin
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {user?.isSelf && (
                                        <input
                                            type="hidden"
                                            name="role"
                                            value={role}
                                        />
                                    )}
                                    <InputError message={errors.role} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="user-position">
                                        Divisi
                                    </Label>
                                    <Select
                                        name="position"
                                        value={position}
                                        onValueChange={(value) =>
                                            setPosition(value as Position)
                                        }
                                        disabled={role !== 'asisten'}
                                    >
                                        <SelectTrigger
                                            id="user-position"
                                            className="w-full"
                                        >
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">
                                                {positionLabels.none}
                                            </SelectItem>
                                            <SelectItem value="sekretaris_bendahara">
                                                {
                                                    positionLabels.sekretaris_bendahara
                                                }
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                    {role !== 'asisten' && (
                                        <input
                                            type="hidden"
                                            name="position"
                                            value="none"
                                        />
                                    )}
                                    <InputError message={errors.position} />
                                </div>
                            </div>
                            <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
                                <div className="grid gap-2">
                                    <Label htmlFor="user-nim">
                                        NIM{role === 'admin' && ' (opsional)'}
                                    </Label>
                                    <Input
                                        id="user-nim"
                                        name="nim"
                                        inputMode="numeric"
                                        defaultValue={user?.nim ?? ''}
                                        className="font-mono"
                                        required={role !== 'admin'}
                                        aria-invalid={!!errors.nim}
                                    />
                                    <InputError message={errors.nim} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="user-name">
                                        Nama lengkap
                                    </Label>
                                    <Input
                                        id="user-name"
                                        name="name"
                                        required
                                        defaultValue={user?.name}
                                        aria-invalid={!!errors.name}
                                    />
                                    <InputError message={errors.name} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="user-email">
                                    Email instansi
                                </Label>
                                <Input
                                    id="user-email"
                                    name="email"
                                    type="email"
                                    required
                                    defaultValue={user?.email}
                                    placeholder="nama@itpln.ac.id"
                                    aria-invalid={!!errors.email}
                                />
                                <InputError message={errors.email} />
                            </div>
                            <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
                                <div className="grid gap-2">
                                    <Label htmlFor="user-major">Jurusan</Label>
                                    <Input
                                        id="user-major"
                                        name="major"
                                        defaultValue={user?.major ?? ''}
                                        placeholder="S1 Teknik Informatika"
                                    />
                                    <InputError message={errors.major} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="user-cohort">
                                        Angkatan
                                    </Label>
                                    <Input
                                        id="user-cohort"
                                        name="cohort_year"
                                        type="number"
                                        min={2000}
                                        max={2100}
                                        defaultValue={user?.cohortYear ?? ''}
                                        className="font-mono"
                                    />
                                    <InputError message={errors.cohort_year} />
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
                                    {user ? 'Simpan Perubahan' : 'Buat Akun'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
