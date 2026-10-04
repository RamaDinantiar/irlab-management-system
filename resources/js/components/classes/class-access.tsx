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
    const [open, setOpen] = useState(false);

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
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="size-8"
                                aria-label="Buat ulang token"
                            >
                                <RefreshCw />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>
                                    Buat ulang token {klass.name}?
                                </DialogTitle>
                                <DialogDescription>
                                    Token{' '}
                                    <span className="font-mono font-bold">
                                        {klass.joinToken}
                                    </span>{' '}
                                    langsung tidak berlaku. Praktikan yang sudah
                                    bergabung tidak terpengaruh.
                                </DialogDescription>
                            </DialogHeader>
                            <Form
                                {...tokenAction}
                                options={{ preserveScroll: true }}
                                onSuccess={() => setOpen(false)}
                            >
                                {({ processing }) => (
                                    <DialogFooter>
                                        <DialogClose asChild>
                                            <Button
                                                type="button"
                                                variant="outline"
                                            >
                                                Batal
                                            </Button>
                                        </DialogClose>
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing && <Spinner />}
                                            Buat Token Baru
                                        </Button>
                                    </DialogFooter>
                                )}
                            </Form>
                        </DialogContent>
                    </Dialog>
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
