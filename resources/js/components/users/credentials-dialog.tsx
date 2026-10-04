import { usePage } from '@inertiajs/react';
import { Check, Copy, KeyRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useClipboard } from '@/hooks/use-clipboard';
import type { IssuedCredentials } from '@/types';

/**
 * Password sementara ditampilkan SEKALI setelah akun dibuat / direset (juga
 * dikirim lewat email). Tidak disimpan di halaman setelah dialog ditutup.
 */
export function CredentialsDialog() {
    const { flash } = usePage();
    const [credentials, setCredentials] = useState<IssuedCredentials | null>(
        null,
    );
    const [copied, copy] = useClipboard();

    useEffect(() => {
        if (flash?.credentials) {
            setCredentials(flash.credentials);
        }
    }, [flash?.credentials]);

    return (
        <Dialog
            open={credentials !== null}
            onOpenChange={(open) => !open && setCredentials(null)}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound
                            className="size-5 text-primary-700"
                            aria-hidden
                        />{' '}
                        Password sementara
                    </DialogTitle>
                    <DialogDescription>
                        Untuk <strong>{credentials?.name}</strong>. Password ini
                        hanya ditampilkan sekali dan juga dikirim ke email
                        pengguna. Pengguna wajib menggantinya saat login
                        pertama.
                    </DialogDescription>
                </DialogHeader>
                <dl className="grid gap-3 bg-primary-50 p-4">
                    <div>
                        <dt className="text-xs text-muted-foreground">
                            NIM/Email
                        </dt>
                        <dd className="font-mono font-bold">
                            {credentials?.login}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-xs text-muted-foreground">
                            Password sementara
                        </dt>
                        <dd className="flex items-center gap-2">
                            <span className="font-mono text-lg font-bold tracking-wider">
                                {credentials?.password}
                            </span>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                onClick={() =>
                                    void copy(credentials?.password ?? '')
                                }
                                aria-label={
                                    copied === credentials?.password
                                        ? 'Password disalin'
                                        : 'Salin password'
                                }
                            >
                                {copied === credentials?.password ? (
                                    <Check className="text-success" />
                                ) : (
                                    <Copy />
                                )}
                            </Button>
                        </dd>
                    </div>
                </dl>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button>Selesai</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
