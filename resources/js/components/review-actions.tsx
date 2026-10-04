import { Form } from '@inertiajs/react';
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
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
import { Textarea } from '@/components/ui/textarea';
import type { RouteFormDefinition } from '@/wayfinder';

/**
 * Setujui, atau Tolak dengan alasan (dikirim ke Asisten pengaju) —
 * pengajuan Mata Kuliah & Kelas (FR-ADM-03, US-A01-1).
 */
export function ReviewActions({
    name,
    proposedBy,
    approveAction,
    rejectAction,
}: {
    name: string;
    proposedBy?: string | null;
    approveAction: RouteFormDefinition<'post'>;
    rejectAction: RouteFormDefinition<'post'>;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex flex-wrap gap-2">
            <Form {...approveAction} options={{ preserveScroll: true }}>
                {({ processing }) => (
                    <Button size="sm" type="submit" disabled={processing}>
                        {processing ? <Spinner /> : <Check />} Setujui
                    </Button>
                )}
            </Form>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                        <X /> Tolak
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Tolak {name}?</DialogTitle>
                        <DialogDescription>
                            Alasan dikirim ke {proposedBy ?? 'Asisten pengaju'}{' '}
                            agar pengajuan dapat direvisi dan diajukan ulang.
                        </DialogDescription>
                    </DialogHeader>
                    <Form
                        {...rejectAction}
                        options={{ preserveScroll: true }}
                        onSuccess={() => setOpen(false)}
                        className="grid gap-4"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="reject-reason">
                                        Alasan penolakan
                                    </Label>
                                    <Textarea
                                        id="reject-reason"
                                        name="reason"
                                        required
                                        minLength={5}
                                        maxLength={500}
                                        aria-invalid={!!errors.reason}
                                    />
                                    <InputError
                                        message={
                                            errors.reason ??
                                            errors.course ??
                                            errors.class
                                        }
                                    />
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
                                        Tolak Pengajuan
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
