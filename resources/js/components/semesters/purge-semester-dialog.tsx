import { Form } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import SemesterController from '@/actions/App/Http/Controllers/Admin/SemesterController';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { SemesterRow } from '@/types';

/** US-D01-4: hapus permanen arsip > 2 tahun dengan mengetik ulang nama semester. */
export function PurgeSemesterDialog({ semester }: { semester: SemesterRow }) {
    const [open, setOpen] = useState(false);
    const [typed, setTyped] = useState('');

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                setTyped('');
            }}
        >
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="ghost"
                    className="text-danger hover:bg-danger-soft hover:text-danger"
                >
                    <Trash2 /> Hapus permanen
                </Button>
            </DialogTrigger>
            <DialogContent className="border-t-danger">
                <DialogHeader>
                    <DialogTitle>Hapus permanen {semester.name}?</DialogTitle>
                    <DialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Semester arsip ini
                        berumur lebih dari 2 tahun dan akan dihapus dari
                        database.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...SemesterController.destroy.form(semester.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="grid gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor={`confirm-${semester.id}`}>
                                    Ketik{' '}
                                    <strong className="font-mono">
                                        {semester.name}
                                    </strong>{' '}
                                    untuk mengonfirmasi
                                </Label>
                                <Input
                                    id={`confirm-${semester.id}`}
                                    name="confirmation"
                                    autoComplete="off"
                                    value={typed}
                                    onChange={(event) =>
                                        setTyped(event.target.value)
                                    }
                                    aria-invalid={!!errors.confirmation}
                                />
                                <InputError message={errors.confirmation} />
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
                                    disabled={
                                        processing || typed !== semester.name
                                    }
                                >
                                    {processing && <Spinner />}
                                    Hapus Permanen
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
