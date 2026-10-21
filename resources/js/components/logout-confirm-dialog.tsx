import { router } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
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
import { Spinner } from '@/components/ui/spinner';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';

/*
 * Satu dialog untuk semua tombol logout (sidebar & menu pengguna). Dialog
 * dirender di layout, bukan di dalam dropdown, agar tidak ikut tertutup saat
 * menu pengguna menutup.
 */
let open = false;
const listeners = new Set<() => void>();

function setOpen(value: boolean) {
    open = value;
    listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

/** Buka konfirmasi logout. */
export function confirmLogout() {
    setOpen(true);
}

export function LogoutConfirmDialog() {
    const isOpen = useSyncExternalStore(subscribe, () => open);
    const [processing, setProcessing] = useState(false);
    const cleanup = useMobileNavigation();

    const signOut = () => {
        setProcessing(true);
        cleanup();
        router.flushAll();
        router.post(
            logout(),
            {},
            {
                onFinish: () => {
                    setProcessing(false);
                    setOpen(false);
                },
            },
        );
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(value) => !processing && setOpen(value)}
        >
            <DialogContent data-test="logout-dialog">
                <DialogHeader>
                    <DialogTitle>Keluar dari IR Lab?</DialogTitle>
                    <DialogDescription>
                        Anda perlu masuk kembali untuk mengakses akun ini.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={processing}
                        >
                            Batal
                        </Button>
                    </DialogClose>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={signOut}
                        disabled={processing}
                        data-test="logout-confirm"
                    >
                        {processing ? <Spinner /> : <LogOut />}
                        Ya, Keluar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
