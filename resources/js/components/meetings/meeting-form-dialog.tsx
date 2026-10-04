import { Form } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

/** "2026-10-07T13:00:00+07:00" → "2026-10-07T13:00" untuk <input type="datetime-local">. */
function toLocalInput(iso: string | null): string {
    if (!iso) {
        return '';
    }

    const date = new Date(iso);
    const wib = new Date(date.getTime() + 7 * 3600_000);

    return wib.toISOString().slice(0, 16);
}

/** FR-AC-04: tambah/ubah pertemuan + unggah modul PDF + tanggal rilis. */
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
                        Modul PDF (maks. 10 MB) baru terlihat praktikan pada
                        tanggal rilis. Kosongkan tanggal rilis untuk langsung
                        merilis.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...action}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="grid gap-5"
                >
                    {({ processing, errors, progress }) => (
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
                                    <Input
                                        id="meeting-date"
                                        name="date"
                                        type="date"
                                        required
                                        defaultValue={meeting?.date}
                                        aria-invalid={!!errors.date}
                                    />
                                    <InputError message={errors.date} />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="meeting-title">
                                    Judul modul
                                </Label>
                                <Input
                                    id="meeting-title"
                                    name="module_title"
                                    maxLength={150}
                                    defaultValue={meeting?.moduleTitle ?? ''}
                                    placeholder="Modul 04 · Classification"
                                />
                                <InputError message={errors.module_title} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="meeting-file">
                                    File modul (PDF)
                                </Label>
                                {meeting?.moduleFile && (
                                    <p className="text-sm">
                                        Saat ini:{' '}
                                        <a
                                            href={meeting.moduleFile.url}
                                            className="font-medium text-primary-700 underline"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {meeting.moduleFile.name}
                                        </a>
                                    </p>
                                )}
                                <Input
                                    id="meeting-file"
                                    name="module_file"
                                    type="file"
                                    accept="application/pdf,.pdf"
                                    aria-invalid={!!errors.module_file}
                                />
                                {progress && (
                                    <div
                                        role="progressbar"
                                        aria-label="Mengunggah"
                                        aria-valuenow={progress.percentage}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                        className="h-1.5 bg-primary-50"
                                    >
                                        <div
                                            className="h-full bg-primary"
                                            style={{
                                                width: `${progress.percentage}%`,
                                            }}
                                        />
                                    </div>
                                )}
                                {meeting?.moduleFile && (
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="remove-module"
                                            name="remove_module"
                                            value="1"
                                        />
                                        <Label
                                            htmlFor="remove-module"
                                            className="font-normal"
                                        >
                                            Hapus file modul
                                        </Label>
                                    </div>
                                )}
                                <InputError message={errors.module_file} />
                            </div>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="meeting-release">
                                        Tanggal rilis modul
                                    </Label>
                                    <Input
                                        id="meeting-release"
                                        name="module_release_at"
                                        type="datetime-local"
                                        defaultValue={toLocalInput(
                                            meeting?.moduleReleaseAt ?? null,
                                        )}
                                    />
                                    <InputError
                                        message={errors.module_release_at}
                                    />
                                </div>
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
