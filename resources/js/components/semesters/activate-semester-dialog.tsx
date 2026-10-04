import { Form } from '@inertiajs/react';
import { Archive, ArrowRight, CheckCircle2, Power } from 'lucide-react';
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
import { Spinner } from '@/components/ui/spinner';
import type { SemesterRow } from '@/types';

/** US-D01-2: konfirmasi aktivasi berisi ringkasan dampak. */
export function ActivateSemesterDialog({
    semester,
    current,
}: {
    semester: SemesterRow;
    /** Semester yang saat ini aktif (akan diarsipkan). */
    current: SemesterRow | undefined;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Power /> Aktifkan
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Aktifkan {semester.name}?</DialogTitle>
                    <DialogDescription>
                        Periksa dampaknya sebelum melanjutkan.
                    </DialogDescription>
                </DialogHeader>
                <ul className="grid gap-3 text-sm">
                    <li className="flex gap-3 bg-success-soft p-3 text-success">
                        <CheckCircle2
                            className="mt-0.5 size-4 shrink-0"
                            aria-hidden
                        />
                        <span>
                            <strong>{semester.name}</strong> menjadi
                            satu-satunya semester Aktif. Kelas, tugas, dan nilai
                            baru tercatat di semester ini.
                        </span>
                    </li>
                    {current ? (
                        <li className="flex gap-3 bg-muted p-3">
                            <Archive
                                className="mt-0.5 size-4 shrink-0"
                                aria-hidden
                            />
                            <span>
                                <strong>{current.name}</strong> (aktif saat ini){' '}
                                <ArrowRight
                                    className="inline size-3.5"
                                    aria-label="menjadi"
                                />{' '}
                                <strong>Arsip</strong>. Datanya tetap tersimpan
                                dan dapat dilihat, tetapi tidak dapat diubah
                                lagi.
                            </span>
                        </li>
                    ) : (
                        <li className="flex gap-3 bg-muted p-3">
                            <Archive
                                className="mt-0.5 size-4 shrink-0"
                                aria-hidden
                            />
                            Belum ada semester aktif, jadi tidak ada yang
                            diarsipkan.
                        </li>
                    )}
                </ul>
                <Form
                    {...SemesterController.activate.form(semester.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                >
                    {({ processing, errors }) => (
                        <>
                            <InputError
                                message={errors.semester}
                                className="mb-3"
                            />
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Batal
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    Ya, Aktifkan
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
