import { Form } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
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
import { DAY_NAMES } from '@/lib/days';
import type { AssistantOption, ClassRow, SelectOption } from '@/types';
import type { RouteFormDefinition } from '@/wayfinder';

function SelectField({
    id,
    name,
    label,
    options,
    defaultValue,
    placeholder,
    error,
}: {
    id: string;
    name: string;
    label: string;
    options: SelectOption[];
    defaultValue?: number;
    placeholder: string;
    error?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <Select
                name={name}
                defaultValue={defaultValue ? String(defaultValue) : undefined}
                required
            >
                <SelectTrigger
                    id={id}
                    className="w-full"
                    aria-invalid={!!error}
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <InputError message={error} />
        </div>
    );
}

/**
 * Form Kelas & Jadwal (US-A01-1, US-D02-2/3). Bentrok ruang ditolak server;
 * bentrok jadwal asisten tampil sebagai peringatan yang bisa dikonfirmasi.
 */
export function ClassFormDialog({
    action,
    title,
    description,
    submitLabel,
    trigger,
    courses,
    rooms,
    klass,
    semesterId,
    assistants,
}: {
    action: RouteFormDefinition<'post'>;
    title: string;
    description: string;
    submitLabel: string;
    trigger: ReactNode;
    courses: SelectOption[];
    rooms: SelectOption[];
    klass?: ClassRow;
    /** Admin, kelas baru: semester tujuan. */
    semesterId?: number;
    /** Admin saja: pilihan asisten pengampu. */
    assistants?: AssistantOption[];
}) {
    const [open, setOpen] = useState(false);
    const selected = new Set(
        klass?.assistants?.map((assistant) => assistant.id),
    );
    const days: SelectOption[] = DAY_NAMES.map((label, index) => ({
        id: index + 1,
        label,
    }));

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <Form
                    {...action}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="grid gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            {semesterId !== undefined && (
                                <input
                                    type="hidden"
                                    name="semester_id"
                                    value={semesterId}
                                />
                            )}
                            <SelectField
                                id="class-course"
                                name="course_id"
                                label="Mata kuliah"
                                options={courses}
                                defaultValue={klass?.course?.id}
                                placeholder="Pilih mata kuliah"
                                error={errors.course_id}
                            />
                            <div className="grid gap-5 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="class-name">
                                        Nama kelas
                                    </Label>
                                    <Input
                                        id="class-name"
                                        name="name"
                                        required
                                        maxLength={50}
                                        defaultValue={klass?.name}
                                        placeholder="Kelas A"
                                        aria-invalid={!!errors.name}
                                    />
                                    <InputError message={errors.name} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="class-quota">Kuota</Label>
                                    <Input
                                        id="class-quota"
                                        name="quota"
                                        type="number"
                                        min={1}
                                        max={200}
                                        required
                                        defaultValue={klass?.quota ?? 30}
                                        aria-invalid={!!errors.quota}
                                    />
                                    <InputError message={errors.quota} />
                                </div>
                            </div>
                            <div className="grid gap-5 sm:grid-cols-3">
                                <SelectField
                                    id="class-day"
                                    name="day_of_week"
                                    label="Hari"
                                    options={days}
                                    defaultValue={klass?.dayOfWeek}
                                    placeholder="Pilih hari"
                                    error={errors.day_of_week}
                                />
                                <div className="grid gap-2">
                                    <Label htmlFor="class-start">
                                        Jam mulai
                                    </Label>
                                    <Input
                                        id="class-start"
                                        name="start_time"
                                        type="time"
                                        required
                                        defaultValue={klass?.startTime}
                                        aria-invalid={!!errors.start_time}
                                    />
                                    <InputError message={errors.start_time} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="class-end">
                                        Jam selesai
                                    </Label>
                                    <Input
                                        id="class-end"
                                        name="end_time"
                                        type="time"
                                        required
                                        defaultValue={klass?.endTime}
                                        aria-invalid={!!errors.end_time}
                                    />
                                    <InputError message={errors.end_time} />
                                </div>
                            </div>
                            {rooms.length === 1 ? (
                                // Hanya satu lab: tidak perlu memilih ruang.
                                <div className="grid gap-2">
                                    <span className="text-sm font-medium">
                                        Ruang
                                    </span>
                                    <input
                                        type="hidden"
                                        name="room_id"
                                        value={rooms[0].id}
                                    />
                                    <p className="flex h-10 items-center border bg-muted/40 px-3 text-sm">
                                        {rooms[0].label}
                                    </p>
                                    <InputError message={errors.room_id} />
                                </div>
                            ) : (
                                <SelectField
                                    id="class-room"
                                    name="room_id"
                                    label="Ruang"
                                    options={rooms}
                                    defaultValue={klass?.room?.id}
                                    placeholder="Pilih ruang"
                                    error={errors.room_id}
                                />
                            )}

                            {assistants && (
                                <fieldset className="grid gap-2">
                                    <legend className="mb-2 text-sm font-medium">
                                        Asisten pengampu
                                    </legend>
                                    <div className="grid max-h-40 gap-2 overflow-y-auto border bg-white p-3 sm:grid-cols-2">
                                        {assistants.map((assistant) => (
                                            <div
                                                key={assistant.id}
                                                className="flex items-center gap-2"
                                            >
                                                <Checkbox
                                                    id={`class-assistant-${assistant.id}`}
                                                    name="assistant_ids[]"
                                                    value={String(assistant.id)}
                                                    defaultChecked={selected.has(
                                                        assistant.id,
                                                    )}
                                                />
                                                <Label
                                                    htmlFor={`class-assistant-${assistant.id}`}
                                                    className="font-normal"
                                                >
                                                    {assistant.name}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </fieldset>
                            )}

                            {errors.assistant_conflict && (
                                <div className="grid gap-3 border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
                                    <p className="flex gap-2">
                                        <AlertTriangle
                                            className="mt-0.5 size-4 shrink-0"
                                            aria-hidden
                                        />
                                        {errors.assistant_conflict}
                                    </p>
                                    <div className="flex items-center gap-2 text-foreground">
                                        <Checkbox
                                            id="confirm-conflicts"
                                            name="confirm_conflicts"
                                            value="1"
                                        />
                                        <Label htmlFor="confirm-conflicts">
                                            Tetap simpan meski jadwal asisten
                                            bentrok
                                        </Label>
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Batal
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />}
                                    {submitLabel}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
