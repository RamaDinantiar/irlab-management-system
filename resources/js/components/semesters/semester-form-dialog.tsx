import { Form } from '@inertiajs/react';
import type { ReactNode } from 'react';
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
import { DateField } from '@/components/pickers/date-field';

/** US-D01-1: buat semester (status Draft) atau ubah nama/tanggalnya. */
export function SemesterFormDialog({
    semester,
    trigger,
}: {
    /** Kosong = buat baru. */
    semester?: SemesterRow;
    trigger: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const action = semester
        ? SemesterController.update.form(semester.id)
        : SemesterController.store.form();

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {semester ? 'Ubah Semester' : 'Buat Semester'}
                    </DialogTitle>
                    <DialogDescription>
                        {semester
                            ? 'Perubahan nama dan tanggal tercatat di audit log.'
                            : 'Semester baru berstatus Draft sampai Anda mengaktifkannya.'}
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...action}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    resetOnSuccess
                    className="grid gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="name">Nama semester</Label>
                                <Input
                                    id="name"
                                    name="name"
                                    required
                                    maxLength={50}
                                    defaultValue={semester?.name}
                                    placeholder="Contoh: Ganjil 2026/2027"
                                    aria-invalid={!!errors.name}
                                />
                                <InputError message={errors.name} />
                            </div>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="start_date">
                                        Tanggal mulai
                                    </Label>
                                    <DateField
                                        id="start_date"
                                        name="start_date"
                                        required
                                        defaultValue={semester?.startDate ?? ''}
                                        invalid={!!errors.start_date}
                                    />
                                    <InputError message={errors.start_date} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="end_date">
                                        Tanggal selesai
                                    </Label>
                                    <DateField
                                        id="end_date"
                                        name="end_date"
                                        required
                                        defaultValue={semester?.endDate ?? ''}
                                        invalid={!!errors.end_date}
                                    />
                                    <InputError message={errors.end_date} />
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
                                    {semester
                                        ? 'Simpan Perubahan'
                                        : 'Buat Semester'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
