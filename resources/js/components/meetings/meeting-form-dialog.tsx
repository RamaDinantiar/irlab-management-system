import { Form } from '@inertiajs/react';
import type { ReactNode } from 'react';
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
import type { MeetingRow, SelectOption } from '@/types';
import type { RouteFormDefinition } from '@/wayfinder';
import { DateField } from '@/components/pickers/date-field';

/** FR-AC-04: tambah/ubah pertemuan (nomor, tanggal, topik, asisten PJ). */
export function MeetingFormDialog({
    action,
    meeting,
    nextNumber,
    assistants,
    trigger,
}: {
    action: RouteFormDefinition<'post'>;
    meeting?: MeetingRow;
    nextNumber?: number;
    assistants: SelectOption[];
    trigger: ReactNode;
}) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        {meeting
                            ? `Ubah Pertemuan ${meeting.number}`
                            : 'Tambah Pertemuan'}
                    </DialogTitle>
                    <DialogDescription>
                        Materi pertemuan tampil di jadwal praktikan dan mengisi
                        otomatis kolom Materi pada laporan mengawas.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...action}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="grid gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-5 sm:grid-cols-[8rem_1fr]">
                                <div className="grid gap-2">
                                    <Label htmlFor="meeting-number">
                                        Pertemuan ke-
                                    </Label>
                                    <Input
                                        id="meeting-number"
                                        name="number"
                                        type="number"
                                        min={1}
                                        max={50}
                                        required
                                        defaultValue={
                                            meeting?.number ?? nextNumber
                                        }
                                        aria-invalid={!!errors.number}
                                    />
                                    <InputError message={errors.number} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="meeting-date">
                                        Tanggal
                                    </Label>
                                    <DateField
                                        id="meeting-date"
                                        name="date"
                                        required
                                        defaultValue={meeting?.date ?? ''}
                                        invalid={!!errors.date}
                                    />
                                    <InputError message={errors.date} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="meeting-topic">
                                    Materi pertemuan
                                </Label>
                                <Input
                                    id="meeting-topic"
                                    name="topic"
                                    maxLength={150}
                                    defaultValue={meeting?.topic ?? ''}
                                    placeholder="Mis. Regresi Linear"
                                    aria-invalid={!!errors.topic}
                                />
                                <InputError message={errors.topic} />
                            </div>
                            <div className="grid gap-5">
                                <div className="grid gap-2">
                                    <Label htmlFor="meeting-assistant">
                                        Asisten penanggung jawab
                                    </Label>
                                    <Select
                                        name="responsible_assistant_id"
                                        defaultValue={
                                            meeting?.responsibleAssistant
                                                ? String(
                                                      meeting
                                                          .responsibleAssistant
                                                          .id,
                                                  )
                                                : undefined
                                        }
                                    >
                                        <SelectTrigger
                                            id="meeting-assistant"
                                            className="w-full"
                                        >
                                            <SelectValue placeholder="Pilih asisten" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {assistants.map((assistant) => (
                                                <SelectItem
                                                    key={assistant.id}
                                                    value={String(assistant.id)}
                                                >
                                                    {assistant.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError
                                        message={
                                            errors.responsible_assistant_id
                                        }
                                    />
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
                                    {meeting ? 'Simpan' : 'Tambah'}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
