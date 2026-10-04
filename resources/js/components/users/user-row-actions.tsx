import { Form } from '@inertiajs/react';
import { KeyRound, Pencil, Power, PowerOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
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
import { Spinner } from '@/components/ui/spinner';
import type { UserRow } from '@/types';
import type { RouteFormDefinition } from '@/wayfinder';
import { UserFormDialog } from './user-form-dialog';

function ConfirmAction({
    trigger,
    title,
    description,
    action,
    confirmLabel,
    destructive = false,
    hidden,
}: {
    trigger: ReactNode;
    title: string;
    description: string;
    action: RouteFormDefinition<'post'>;
    confirmLabel: string;
    destructive?: boolean;
    hidden?: Record<string, string>;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <Form
                    {...action}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                >
                    {({ processing }) => (
                        <>
                            {Object.entries(hidden ?? {}).map(
                                ([name, value]) => (
                                    <input
                                        key={name}
                                        type="hidden"
                                        name={name}
                                        value={value}
                                    />
                                ),
                            )}
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Batal
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    variant={
                                        destructive ? 'destructive' : 'default'
                                    }
                                    disabled={processing}
                                >
                                    {processing && <Spinner />}
                                    {confirmLabel}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/** Aksi per akun: ubah, reset password (US-D04-1), nonaktifkan/aktifkan (US-D04-2). */
export function UserRowActions({ user }: { user: UserRow }) {
    return (
        <div className="flex flex-wrap justify-end gap-1">
            <UserFormDialog
                user={user}
                trigger={
                    <Button size="sm" variant="outline">
                        <Pencil /> Ubah
                    </Button>
                }
            />
            <ConfirmAction
                title={`Reset password ${user.name}?`}
                description={`Password sementara baru dikirim ke ${user.email}; password lama langsung tidak berlaku dan pengguna wajib menggantinya saat login.`}
                action={UserController.resetPassword.form(user.id)}
                confirmLabel="Reset Password"
                trigger={
                    <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Reset password ${user.name}`}
                    >
                        <KeyRound />
                    </Button>
                }
            />
            {!user.isSelf &&
                (user.isActive ? (
                    <ConfirmAction
                        title={`Nonaktifkan ${user.name}?`}
                        description="Semua sesi aktif akun ini langsung berakhir dan pengguna tidak dapat masuk sampai diaktifkan kembali. Data akun tetap tersimpan."
                        action={UserController.activation.form(user.id)}
                        hidden={{ active: '0' }}
                        confirmLabel="Nonaktifkan"
                        destructive
                        trigger={
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-danger hover:bg-danger-soft hover:text-danger"
                                aria-label={`Nonaktifkan ${user.name}`}
                            >
                                <PowerOff />
                            </Button>
                        }
                    />
                ) : (
                    <ConfirmAction
                        title={`Aktifkan kembali ${user.name}?`}
                        description="Pengguna dapat masuk lagi dengan password terakhirnya."
                        action={UserController.activation.form(user.id)}
                        hidden={{ active: '1' }}
                        confirmLabel="Aktifkan"
                        trigger={
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-success"
                                aria-label={`Aktifkan ${user.name}`}
                            >
                                <Power />
                            </Button>
                        }
                    />
                ))}
        </div>
    );
}
