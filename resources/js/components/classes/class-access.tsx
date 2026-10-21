import { Form } from '@inertiajs/react';
import { Check, Copy, Lock, LockOpen, RefreshCw } from 'lucide-react';
import { useState } from 'react';
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
import { useClipboard } from '@/hooks/use-clipboard';
import { cn } from '@/lib/utils';
import type { ClassRow } from '@/types';
import type { RouteFormDefinition } from '@/wayfinder';

/**
 * Token kelas + salin, regenerate (konfirmasi: token lama langsung tidak
 * berlaku), dan Lock Class (US-A01-1/3/4).
 */
export function ClassAccess({
    klass,
    tokenAction,
    lockAction,
}: {
    klass: ClassRow;
    tokenAction: RouteFormDefinition<'post'>;
    lockAction: RouteFormDefinition<'post'>;
}) {
    const [copied, copy] = useClipboard();

    if (!klass.joinToken) {
        return (
            <p className="text-xs text-muted-foreground">
                Token dibuat setelah disetujui Admin
            </p>
        );
    }

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="border border-primary-200 bg-primary-50 px-2 py-1 font-mono text-sm font-bold tracking-[0.2em] text-primary-900">
                {klass.joinToken}
            </span>
            <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => void copy(klass.joinToken ?? '')}
                aria-label={
                    copied === klass.joinToken
                        ? 'Token disalin'
                        : `Salin token ${klass.joinToken}`
                }
            >
                {copied === klass.joinToken ? (
                    <Check className="text-success" />
                ) : (
                    <Copy />
                )}
            </Button>
            {klass.canEdit && (
                <>
                    <RegenerateTokenButton klass={klass} action={tokenAction} />
                    <Form {...lockAction} options={{ preserveScroll: true }}>
                        {({ processing }) => (
                            <>
                                <input
                                    type="hidden"
                                    name="locked"
                                    value={klass.isLocked ? '0' : '1'}
                                />
                                <Button
                                    size="sm"
                                    variant="outline"
                                    type="submit"
                                    disabled={processing}
                                >
                                    {klass.isLocked ? <LockOpen /> : <Lock />}
                                    {klass.isLocked
                                        ? 'Buka Kunci'
                                        : 'Kunci Kelas'}
                                </Button>
                            </>
                        )}
                    </Form>
                </>
            )}
        </div>
    );
}

/** Buat ulang token (konfirmasi: token lama langsung tidak berlaku). */
export function RegenerateTokenButton({
    klass,
    action,
    className,
}: {
    klass: ClassRow;
    action: RouteFormDefinition<'post'>;
    className?: string;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    className={cn('size-8', className)}
                    aria-label="Buat ulang token"
                    title="Buat ulang token"
                >
                    <RefreshCw />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Buat ulang token {klass.name}?</DialogTitle>
                    <DialogDescription>
                        Token{' '}
                        <span className="font-mono font-bold">
                            {klass.joinToken}
                        </span>{' '}
                        langsung tidak berlaku. Praktikan yang sudah bergabung
                        tidak terpengaruh.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...action}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                >
                    {({ processing }) => (
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline">
                                    Batal
                                </Button>
                            </DialogClose>
                            <Button type="submit" disabled={processing}>
                                {processing && <Spinner />}
                                Buat Token Baru
                            </Button>
                        </DialogFooter>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Saklar "Pendaftaran Buka" (Figma "Class") — membuka/menutup pendaftaran
 * lewat Lock Class (US-A01-4). Kelas terkunci otomatis saat kuota penuh.
 */
export function EnrollmentSwitch({
    klass,
    action,
}: {
    klass: ClassRow;
    action: RouteFormDefinition<'post'>;
}) {
    const open = !klass.isLocked;

    return (
        <Form {...action} options={{ preserveScroll: true }}>
            {({ processing }) => (
                <>
                    <input
                        type="hidden"
                        name="locked"
                        value={open ? '1' : '0'}
                    />
                    <button
                        type="submit"
                        role="switch"
                        aria-checked={open}
                        disabled={processing || !klass.canEdit}
                        className="group flex items-center gap-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <span
                            aria-hidden
                            className={cn(
                                'relative h-7 w-12 shrink-0 rounded-full transition-colors group-focus-visible:ring-[3px] group-focus-visible:ring-ring/40',
                                open ? 'bg-primary-500' : 'bg-input',
                            )}
                        >
                            <span
                                className={cn(
                                    'absolute top-1 left-1 size-5 rounded-full bg-white shadow transition-transform',
                                    open && 'translate-x-5',
                                )}
                            />
                        </span>
                        Pendaftaran {open ? 'Buka' : 'Tutup'}
                    </button>
                </>
            )}
        </Form>
    );
}
