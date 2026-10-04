import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    ChevronDown,
    CircleHelp,
    Clock,
    FileText,
    ImageIcon,
    Info,
    Lock,
    LockOpen,
    Paperclip,
    Pencil,
    Plus,
    Search,
    Send,
    ShieldCheck,
    Trash2,
    Undo2,
    UploadCloud,
    Users,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import ReportController from '@/actions/App/Http/Controllers/Asisten/ReportController';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { formatRelative } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { PendingShift, ReportRow, ReportStatus } from '@/types';

type Props = {
    filters: { month: string; q: string; tab: 'mine' | 'verify' | 'all' };
    days: { date: string; reports: ReportRow[] }[];
    isReviewer: boolean;
    toVerify: number;
    pendingShifts: PendingShift[];
    classOptions: { id: number; course: string; code: string; name: string }[];
    assistantOptions: { id: number; name: string }[];
};

const STATUS: Record<
    ReportStatus,
    { label: string; variant: 'success' | 'warning' | 'destructive' | 'muted' }
> = {
    draft: { label: 'Draft', variant: 'warning' },
    submitted: { label: 'Diajukan', variant: 'warning' },
    verified: { label: 'Diverifikasi', variant: 'success' },
    returned: { label: 'Dikembalikan', variant: 'destructive' },
};

const CONDITIONS = {
    baik: 'Baik',
    kendala_ringan: 'Kendala ringan',
    kendala_berat: 'Kendala berat',
} as const;

const longDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
const initials = (name: string) =>
    name
        .split(' ')
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase();

type FormData = {
    shift_id: string;
    date: string;
    start_time: string;
    end_time: string;
    class_id: string;
    activity: string;
    material: string;
    present_count: string;
    lab_condition: keyof typeof CONDITIONS;
    notes: string;
    assistant_ids: string[];
    photo: File | null;
    submit: boolean;
};

/** Figma "Report Upload" — modal form + konfirmasi (US-A03, FR-AR-01). */
function ReportFormDialog({
    open,
    onOpenChange,
    report,
    props,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    report: ReportRow | null;
    props: Props;
}) {
    const me = usePage().props.auth.user;
    const today = new Date().toLocaleDateString('sv-SE');
    const first = props.pendingShifts[0];
    const fileInput = useRef<HTMLInputElement>(null);
    const [confirming, setConfirming] = useState(false);
    const [dragging, setDragging] = useState(false);

    const team = (ids: number[]) =>
        [0, 1, 2, 3].map((i) => (ids[i] ? String(ids[i]) : ''));
    const form = useForm<FormData>(
        report
            ? {
                  shift_id: report.shiftId ? String(report.shiftId) : '',
                  date: report.date,
                  start_time: report.start,
                  end_time: report.end,
                  class_id: report.classId ? String(report.classId) : '',
                  activity: report.activity,
                  material: report.material ?? '',
                  present_count: String(report.presentCount),
                  lab_condition: report.labCondition,
                  notes: report.notes,
                  assistant_ids: team(report.assistants.map((a) => a.id)),
                  photo: null,
                  submit: false,
              }
            : {
                  shift_id: first ? String(first.id) : '',
                  date: first?.date ?? today,
                  start_time: first?.start ?? '',
                  end_time: first?.end ?? '',
                  class_id: first?.classId ? String(first.classId) : '',
                  activity: first?.title ?? '',
                  material: '',
                  present_count: '',
                  lab_condition: 'baik',
                  notes: '',
                  assistant_ids: team(first?.teamIds ?? [me.id]),
                  photo: null,
                  submit: false,
              },
    );

    const selectedClass = props.classOptions.find(
        (c) => String(c.id) === form.data.class_id,
    );
    const courses = [
        ...new Map(props.classOptions.map((c) => [c.course, c.code])).entries(),
    ];
    const [course, setCourse] = useState(selectedClass?.course ?? '');

    const applyShift = (id: string) => {
        const shift = props.pendingShifts.find((s) => String(s.id) === id);
        if (!shift) {
            form.setData('shift_id', '');

            return;
        }

        const cls = props.classOptions.find((c) => c.id === shift.classId);
        setCourse(cls?.course ?? '');
        form.setData((d) => ({
            ...d,
            shift_id: id,
            date: shift.date,
            start_time: shift.start,
            end_time: shift.end,
            class_id: shift.classId ? String(shift.classId) : '',
            activity: shift.title,
            assistant_ids: team(shift.teamIds),
        }));
    };

    const send = (submit: boolean) => {
        const url = report
            ? ReportController.update.url(report.id)
            : ReportController.store.url();
        form.transform((data) => ({
            ...data,
            assistant_ids: data.assistant_ids.filter(Boolean),
            submit,
        }));
        form.post(url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setConfirming(false);
                onOpenChange(false);
            },
            onError: () => setConfirming(false),
        });
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        setConfirming(true);
    };

    const teamNames = form.data.assistant_ids
        .filter(Boolean)
        .map(
            (id, i) =>
                `${props.assistantOptions.find((a) => String(a.id) === id)?.name ?? ''}${i === 0 ? ' (Lead)' : ''}`,
        );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[92svh] overflow-y-auto border-t-8 border-t-primary-600 sm:max-w-3xl">
                {!confirming ? (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex flex-wrap items-center gap-3 text-h2">
                                <span className="border-primary-300 flex size-10 items-center justify-center border bg-primary-50 text-primary-700">
                                    <FileText className="size-5" aria-hidden />
                                </span>
                                Laporan Mengawas
                                <Badge variant="secondary">
                                    Formulir Shift
                                </Badge>
                            </DialogTitle>
                            <DialogDescription>
                                Unggah berita acara, presensi asisten jaga, dan
                                dokumentasi foto kegiatan praktikum.
                            </DialogDescription>
                        </DialogHeader>
                        {form.errors &&
                            (form.errors as Record<string, string>).report && (
                                <InputError
                                    message={
                                        (form.errors as Record<string, string>)
                                            .report
                                    }
                                />
                            )}
                        <form onSubmit={submit} className="grid gap-5">
                            {!report && props.pendingShifts.length > 0 && (
                                <div className="grid gap-2">
                                    <Label htmlFor="r-shift">
                                        Shift (terisi otomatis dari jadwal)
                                    </Label>
                                    <select
                                        id="r-shift"
                                        value={form.data.shift_id}
                                        onChange={(e) =>
                                            applyShift(e.target.value)
                                        }
                                        className="h-10 border border-input bg-white px-3 text-sm"
                                    >
                                        {props.pendingShifts.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {longDate(s.date)} · {s.start}–
                                                {s.end} · {s.title}
                                            </option>
                                        ))}
                                        <option value="">
                                            Lainnya (isi manual)
                                        </option>
                                    </select>
                                    <InputError
                                        message={form.errors.shift_id}
                                    />
                                </div>
                            )}
                            <div className="grid gap-5 md:grid-cols-2">
                                <div className="grid content-start gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="r-date">
                                            Tanggal Shift{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="r-date"
                                            type="date"
                                            required
                                            max={today}
                                            value={form.data.date}
                                            onChange={(e) =>
                                                form.setData(
                                                    'date',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={form.errors.date}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <span className="text-sm font-medium">
                                            Jam Praktikum{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </span>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                aria-label="Jam mulai"
                                                type="time"
                                                required
                                                value={form.data.start_time}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'start_time',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <Input
                                                aria-label="Jam selesai"
                                                type="time"
                                                required
                                                value={form.data.end_time}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'end_time',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                        <InputError
                                            message={
                                                form.errors.start_time ??
                                                form.errors.end_time
                                            }
                                        />
                                    </div>
                                    <fieldset className="grid gap-3 border bg-muted/40 p-4">
                                        <legend className="flex w-full items-center justify-between gap-2 px-1 text-sm font-bold">
                                            <span className="flex items-center gap-2">
                                                <Users
                                                    className="size-4 text-primary-700"
                                                    aria-hidden
                                                />{' '}
                                                Tim Asisten Jaga
                                            </span>
                                        </legend>
                                        <p className="-mt-1 text-[11px] text-muted-foreground">
                                            Wajib min. 1 asisten; Anda harus
                                            termasuk tim.
                                        </p>
                                        {[0, 1, 2, 3].map((i) => (
                                            <div key={i} className="grid gap-1">
                                                <Label
                                                    htmlFor={`r-team-${i}`}
                                                    className="text-xs"
                                                >
                                                    Asisten {i + 1}
                                                    {i === 0 && ' (Lead)'}
                                                </Label>
                                                <select
                                                    id={`r-team-${i}`}
                                                    required={i === 0}
                                                    value={
                                                        form.data.assistant_ids[
                                                            i
                                                        ]
                                                    }
                                                    onChange={(e) =>
                                                        form.setData(
                                                            'assistant_ids',
                                                            form.data.assistant_ids.map(
                                                                (v, j) =>
                                                                    j === i
                                                                        ? e
                                                                              .target
                                                                              .value
                                                                        : v,
                                                            ),
                                                        )
                                                    }
                                                    className="h-9 border border-input bg-white px-3 text-sm"
                                                >
                                                    <option value="">-</option>
                                                    {props.assistantOptions.map(
                                                        (a) => (
                                                            <option
                                                                key={a.id}
                                                                value={a.id}
                                                                disabled={
                                                                    form.data.assistant_ids.includes(
                                                                        String(
                                                                            a.id,
                                                                        ),
                                                                    ) &&
                                                                    form.data
                                                                        .assistant_ids[
                                                                        i
                                                                    ] !==
                                                                        String(
                                                                            a.id,
                                                                        )
                                                                }
                                                            >
                                                                {a.name}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                            </div>
                                        ))}
                                        <InputError
                                            message={form.errors.assistant_ids}
                                        />
                                    </fieldset>
                                </div>

                                <div className="grid content-start gap-4">
                                    <div className="grid gap-2">
                                        <span className="flex items-center justify-between text-sm font-medium">
                                            Kode MK
                                            <span className="border-primary-300 inline-flex items-center gap-1 border bg-primary-50 px-2 py-0.5 text-[10px] text-primary-800">
                                                ● Terisi Otomatis
                                            </span>
                                        </span>
                                        <div className="flex h-10 items-center justify-between border bg-muted px-3 font-mono text-sm text-muted-foreground">
                                            {selectedClass?.code ?? 'Otomatis'}{' '}
                                            <Lock
                                                className="size-3.5"
                                                aria-hidden
                                            />
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="r-course">
                                            Mata Kuliah
                                        </Label>
                                        <select
                                            id="r-course"
                                            value={course}
                                            onChange={(e) => {
                                                setCourse(e.target.value);
                                                form.setData('class_id', '');
                                            }}
                                            className="h-10 border border-input bg-white px-3 text-sm"
                                        >
                                            <option value="">
                                                — Kegiatan non-praktikum —
                                            </option>
                                            {courses.map(([name]) => (
                                                <option key={name} value={name}>
                                                    {name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    {course && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="r-class">
                                                Kelas
                                            </Label>
                                            <select
                                                id="r-class"
                                                value={form.data.class_id}
                                                onChange={(e) => {
                                                    const cls =
                                                        props.classOptions.find(
                                                            (c) =>
                                                                String(c.id) ===
                                                                e.target.value,
                                                        );
                                                    form.setData((d) => ({
                                                        ...d,
                                                        class_id:
                                                            e.target.value,
                                                        activity: cls
                                                            ? `${cls.course} · ${cls.name}`
                                                            : d.activity,
                                                    }));
                                                }}
                                                className="h-10 border border-input bg-white px-3 text-sm"
                                            >
                                                <option value="">
                                                    Pilih kelas…
                                                </option>
                                                {props.classOptions
                                                    .filter(
                                                        (c) =>
                                                            c.course === course,
                                                    )
                                                    .map((c) => (
                                                        <option
                                                            key={c.id}
                                                            value={c.id}
                                                        >
                                                            {c.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="grid gap-2">
                                        <Label htmlFor="r-activity">
                                            Kelas / Kegiatan{' '}
                                            <span className="text-destructive">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            id="r-activity"
                                            required
                                            maxLength={150}
                                            value={form.data.activity}
                                            onChange={(e) =>
                                                form.setData(
                                                    'activity',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={form.errors.activity}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="grid gap-2">
                                            <Label htmlFor="r-present">
                                                Praktikan hadir{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                id="r-present"
                                                type="number"
                                                min={0}
                                                max={500}
                                                required
                                                value={form.data.present_count}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'present_count',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <InputError
                                                message={
                                                    form.errors.present_count
                                                }
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="r-cond">
                                                Kondisi lab{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <select
                                                id="r-cond"
                                                value={form.data.lab_condition}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'lab_condition',
                                                        e.target
                                                            .value as FormData['lab_condition'],
                                                    )
                                                }
                                                className="h-10 border border-input bg-white px-3 text-sm"
                                            >
                                                {Object.entries(CONDITIONS).map(
                                                    ([value, label]) => (
                                                        <option
                                                            key={value}
                                                            value={value}
                                                        >
                                                            {label}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="r-material">
                                            Materi
                                        </Label>
                                        <Input
                                            id="r-material"
                                            maxLength={150}
                                            value={form.data.material}
                                            onChange={(e) =>
                                                form.setData(
                                                    'material',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Mis. OLAP, Regresi Linear"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label
                                            htmlFor="r-notes"
                                            className="flex justify-between"
                                        >
                                            <span>
                                                Deskripsi Kegiatan &amp;
                                                Kejadian{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </span>
                                            <span className="text-[11px] font-normal text-muted-foreground">
                                                Materi &amp; progress shift
                                            </span>
                                        </Label>
                                        <Textarea
                                            id="r-notes"
                                            required
                                            minLength={10}
                                            maxLength={3000}
                                            rows={5}
                                            value={form.data.notes}
                                            onChange={(e) =>
                                                form.setData(
                                                    'notes',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Deskripsikan kegiatan mengawas…"
                                        />
                                        <InputError
                                            message={form.errors.notes}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-2">
                                <span className="flex justify-between text-sm font-medium">
                                    Upload Foto Dokumentasi{' '}
                                    <span className="text-[11px] font-normal text-muted-foreground">
                                        Opsional · JPG/PNG maks. 5 MB
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => fileInput.current?.click()}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragging(true);
                                    }}
                                    onDragLeave={() => setDragging(false)}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        setDragging(false);
                                        const file = e.dataTransfer.files[0];
                                        if (file) form.setData('photo', file);
                                    }}
                                    className={cn(
                                        'grid justify-items-center gap-1 border-2 border-dashed px-4 py-6 text-center focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none',
                                        dragging
                                            ? 'border-primary-600 bg-primary-50'
                                            : 'border-slate-300',
                                    )}
                                >
                                    <UploadCloud
                                        className="size-8 text-slate-400"
                                        aria-hidden
                                    />
                                    <span className="text-sm">
                                        {form.data.photo
                                            ? form.data.photo.name
                                            : 'Pilih file atau seret & lepas di sini'}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        {report?.photo && !form.data.photo
                                            ? `Foto saat ini: ${report.photo.name}`
                                            : 'png, jpeg · maks 5 MB'}
                                    </span>
                                </button>
                                <input
                                    ref={fileInput}
                                    type="file"
                                    accept="image/png,image/jpeg"
                                    className="sr-only"
                                    aria-label="Foto dokumentasi"
                                    onChange={(e) =>
                                        form.setData(
                                            'photo',
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                <InputError message={form.errors.photo} />
                            </div>

                            <DialogFooter className="items-center gap-2 sm:justify-between">
                                <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
                                    <ShieldCheck
                                        className="size-4"
                                        aria-hidden
                                    />{' '}
                                    Dapat diedit hingga H+1 pukul 23.59
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => onOpenChange(false)}
                                    >
                                        Batal
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={form.processing}
                                        onClick={() => send(false)}
                                    >
                                        Simpan Draft
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                    >
                                        <CheckCircle2 /> Simpan Laporan
                                    </Button>
                                </div>
                            </DialogFooter>
                        </form>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                                <span className="flex size-10 items-center justify-center bg-primary-50 text-primary-800">
                                    <CircleHelp
                                        className="size-5"
                                        aria-hidden
                                    />
                                </span>
                                Konfirmasi Simpan Laporan Mengawas
                            </DialogTitle>
                            <DialogDescription>
                                Pastikan data shift, tim asisten jaga, kegiatan,
                                dan foto dokumentasi sudah benar sebelum dikirim
                                ke Sekretaris.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-3 bg-muted/50 p-5 text-sm">
                            <p className="flex justify-between border-b pb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                                Ringkasan Berkas Laporan
                            </p>
                            <p className="flex gap-3">
                                <CalendarDays
                                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                                    aria-hidden
                                />
                                <span>
                                    <span className="block text-xs text-muted-foreground">
                                        Shift &amp; Waktu
                                    </span>
                                    {longDate(form.data.date)},{' '}
                                    {form.data.start_time}–{form.data.end_time}{' '}
                                    WIB
                                </span>
                            </p>
                            <p className="flex gap-3">
                                <FileText
                                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                                    aria-hidden
                                />
                                <span>
                                    <span className="block text-xs text-muted-foreground">
                                        Mata Kuliah / Kegiatan
                                    </span>
                                    {form.data.activity} · hadir{' '}
                                    {form.data.present_count || 0} ·{' '}
                                    {CONDITIONS[form.data.lab_condition]}
                                </span>
                            </p>
                            <p className="flex gap-3">
                                <Users
                                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                                    aria-hidden
                                />
                                <span>
                                    <span className="block text-xs text-muted-foreground">
                                        Tim Asisten
                                    </span>
                                    {teamNames.join(', ')}
                                </span>
                            </p>
                            <p className="flex gap-3">
                                <Paperclip
                                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                                    aria-hidden
                                />
                                <span>
                                    <span className="block text-xs text-muted-foreground">
                                        Foto Dokumentasi
                                    </span>
                                    {form.data.photo
                                        ? `1 berkas terlampir (${form.data.photo.name})`
                                        : report?.photo
                                          ? `Tetap: ${report.photo.name}`
                                          : 'Tidak ada lampiran'}
                                </span>
                            </p>
                        </div>
                        <p className="flex gap-2 bg-muted p-3 text-xs">
                            <Info className="size-4 shrink-0" aria-hidden />
                            <span>
                                <strong>Catatan:</strong> laporan yang dikirim
                                diteruskan ke Sekretaris untuk diverifikasi;
                                hanya laporan terverifikasi yang masuk rekap
                                honor.
                            </span>
                        </p>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setConfirming(false)}
                            >
                                ← Periksa Kembali
                            </Button>
                            <Button
                                onClick={() => send(true)}
                                disabled={form.processing}
                            >
                                {form.processing ? (
                                    <Spinner />
                                ) : (
                                    <CheckCircle2 />
                                )}{' '}
                                Simpan Laporan
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}

function ReturnDialog({
    report,
    onClose,
}: {
    report: ReportRow | null;
    onClose: () => void;
}) {
    const form = useForm({ note: '' });

    return (
        <Dialog
            open={report !== null}
            onOpenChange={(open) => !open && onClose()}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Kembalikan Laporan</DialogTitle>
                    <DialogDescription>
                        Pembuat laporan menerima catatan ini dan dapat
                        memperbaiki hingga besok pukul 23.59.
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (report)
                            form.post(ReportController.return.url(report.id), {
                                preserveScroll: true,
                                onSuccess: onClose,
                            });
                    }}
                    className="grid gap-4"
                >
                    <Label htmlFor="return-note">Catatan perbaikan</Label>
                    <Textarea
                        id="return-note"
                        required
                        minLength={5}
                        maxLength={500}
                        value={form.data.note}
                        onChange={(e) => form.setData('note', e.target.value)}
                    />
                    <InputError message={form.errors.note} />
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                        >
                            Batal
                        </Button>
                        <Button
                            type="submit"
                            variant="destructive"
                            disabled={form.processing}
                        >
                            <Undo2 /> Kembalikan
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function dayStatus(reports: ReportRow[]): ReportStatus {
    if (reports.some((r) => r.status === 'returned')) return 'returned';
    if (reports.some((r) => r.status === 'draft')) return 'draft';
    if (reports.some((r) => r.status === 'submitted')) return 'submitted';

    return 'verified';
}

/** Asisten › Report — Figma "Report" (Lab Monitoring Report). */
export default function AsistenReport(props: Props) {
    const { filters, days, isReviewer, toVerify } = props;
    const semester = usePage().props.activeSemester;
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<ReportRow | null>(null);
    const [returning, setReturning] = useState<ReportRow | null>(null);
    const [openDays, setOpenDays] = useState<Set<string>>(
        () => new Set(days.slice(0, 2).map((d) => d.date)),
    );
    const [search, setSearch] = useState(filters.q);
    const total = useMemo(
        () => days.reduce((sum, d) => sum + d.reports.length, 0),
        [days],
    );

    const go = (next: Partial<Props['filters']>) =>
        router.get(
            ReportController.index.url({ query: { ...filters, ...next } }),
            {},
            { preserveScroll: true, preserveState: true },
        );
    const toggle = (date: string) =>
        setOpenDays((s) => {
            const n = new Set(s);
            if (n.has(date)) n.delete(date);
            else n.add(date);
            return n;
        });
    const act = (url: string) => router.post(url, {}, { preserveScroll: true });

    return (
        <>
            <Head title="Lab Monitoring Report" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-1">
                        <h1 className="text-h1 font-bold text-primary-900">
                            Lab Monitoring Report
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Pemantauan kehadiran asisten, progres materi
                            praktikum, dan dokumentasi sesi mengawas harian.
                        </p>
                    </div>
                    <Button
                        size="lg"
                        onClick={() => {
                            setEditing(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus /> Buat Laporan Baru
                    </Button>
                </div>

                <div className="border-primary-300 flex flex-wrap items-center justify-between gap-3 border bg-primary-50 px-4 py-3 text-sm">
                    <p className="flex items-start gap-3">
                        <Info
                            className="mt-0.5 size-5 shrink-0 text-primary-700"
                            aria-hidden
                        />
                        <span>
                            <strong>Pengisian cepat:</strong> form terisi
                            otomatis dari shift Anda hari ini. Laporan dapat
                            diedit hingga H+1 pukul 23.59, lalu terkunci.
                            {props.pendingShifts.length > 0 && (
                                <strong className="text-danger">
                                    {' '}
                                    {props.pendingShifts.length} shift belum
                                    dilaporkan.
                                </strong>
                            )}
                        </span>
                    </p>
                    {semester && (
                        <span className="bg-primary-100 px-3 py-1 font-mono text-xs text-primary-800">
                            Semester {semester.name}
                        </span>
                    )}
                </div>

                {isReviewer && (
                    <div
                        role="tablist"
                        aria-label="Cakupan laporan"
                        className="flex gap-6 border-b border-primary-200"
                    >
                        {(
                            [
                                ['mine', 'Laporan Saya'],
                                [
                                    'verify',
                                    `Perlu Verifikasi${toVerify ? ` (${toVerify})` : ''}`,
                                ],
                                ['all', 'Semua Laporan'],
                            ] as const
                        ).map(([value, label]) => (
                            <button
                                key={value}
                                role="tab"
                                aria-selected={filters.tab === value}
                                onClick={() => go({ tab: value })}
                                className={cn(
                                    '-mb-px border-b-2 px-1 pb-2.5 text-sm font-bold',
                                    filters.tab === value
                                        ? 'border-primary-700 text-primary-800'
                                        : 'border-transparent text-muted-foreground',
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                <section
                    aria-labelledby="list-title"
                    className="border bg-card"
                >
                    <div className="flex flex-wrap items-center gap-3 border-b p-5">
                        <h2
                            id="list-title"
                            className="mr-auto text-h2 font-bold"
                        >
                            Daftar Mengawas{' '}
                            <span className="text-sm font-normal text-muted-foreground">
                                ({total} laporan)
                            </span>
                        </h2>
                        {filters.tab !== 'verify' && (
                            <label className="flex items-center gap-2 border border-primary-700 px-3 py-1.5 text-sm">
                                <CalendarDays
                                    className="size-4 text-primary-700"
                                    aria-hidden
                                />
                                <span className="sr-only">Bulan</span>
                                <input
                                    type="month"
                                    value={filters.month}
                                    onChange={(e) =>
                                        e.target.value &&
                                        go({ month: e.target.value })
                                    }
                                    className="bg-transparent font-medium focus-visible:outline-none"
                                />
                            </label>
                        )}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                go({ q: search });
                            }}
                            className="relative"
                        >
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden
                            />
                            <Input
                                type="search"
                                aria-label="Cari laporan"
                                placeholder="Cari kata kunci…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-56 pl-9"
                            />
                        </form>
                    </div>

                    {days.length === 0 ? (
                        <div className="p-5">
                            <EmptyState
                                icon={FileText}
                                title="Belum ada laporan"
                                description={
                                    filters.tab === 'verify'
                                        ? 'Tidak ada laporan yang menunggu verifikasi.'
                                        : 'Belum ada laporan pada periode ini.'
                                }
                            />
                        </div>
                    ) : (
                        <ul>
                            {days.map((day) => {
                                const status = STATUS[dayStatus(day.reports)];
                                const open = openDays.has(day.date);

                                return (
                                    <li
                                        key={day.date}
                                        className="border-b last:border-b-0"
                                    >
                                        <button
                                            type="button"
                                            aria-expanded={open}
                                            onClick={() => toggle(day.date)}
                                            className="flex w-full flex-wrap items-center gap-3 px-5 py-3.5 text-left hover:bg-primary-50/50"
                                        >
                                            <ChevronDown
                                                className={cn(
                                                    'size-4 transition-transform',
                                                    !open && '-rotate-90',
                                                )}
                                                aria-hidden
                                            />
                                            <span className="font-bold">
                                                {longDate(day.date)}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {day.reports.length} laporan
                                            </span>
                                            <Badge
                                                variant={status.variant}
                                                className="ml-auto"
                                            >
                                                {status.label}
                                            </Badge>
                                        </button>
                                        {open && (
                                            <div className="overflow-x-auto">
                                                <table className="w-full min-w-[64rem] text-sm">
                                                    <thead className="border-y bg-primary-50/60 text-left font-mono text-xs">
                                                        <tr>
                                                            <th className="px-4 py-2.5">
                                                                Shift
                                                            </th>
                                                            <th className="px-3 py-2.5">
                                                                Jam
                                                            </th>
                                                            <th className="px-3 py-2.5">
                                                                Kode MK
                                                            </th>
                                                            <th className="px-3 py-2.5">
                                                                Mata Kuliah
                                                                &amp; Kelas
                                                            </th>
                                                            <th className="px-3 py-2.5">
                                                                Asisten Jaga
                                                            </th>
                                                            <th className="px-3 py-2.5">
                                                                Materi
                                                            </th>
                                                            <th className="px-3 py-2.5">
                                                                Deskripsi
                                                                Kegiatan
                                                            </th>
                                                            <th className="px-3 py-2.5">
                                                                Bukti
                                                            </th>
                                                            <th className="px-3 py-2.5">
                                                                Status
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {day.reports.map(
                                                            (r) => (
                                                                <tr
                                                                    key={r.id}
                                                                    className="border-b align-top last:border-b-0"
                                                                >
                                                                    <td className="px-4 py-3">
                                                                        <span className="bg-primary-100 px-2 py-0.5 text-xs whitespace-nowrap text-primary-800">
                                                                            Shift{' '}
                                                                            {
                                                                                r.shiftNumber
                                                                            }
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">
                                                                        {
                                                                            r.start
                                                                        }
                                                                        –{r.end}
                                                                    </td>
                                                                    <td className="px-3 py-3 font-mono text-xs">
                                                                        {r.code ??
                                                                            '—'}
                                                                    </td>
                                                                    <td className="px-3 py-3">
                                                                        {r.course ??
                                                                            r.activity}
                                                                        {r.className && (
                                                                            <Badge
                                                                                variant="secondary"
                                                                                className="mt-1 block w-fit"
                                                                            >
                                                                                {
                                                                                    r.className
                                                                                }
                                                                            </Badge>
                                                                        )}
                                                                        <span className="mt-1 block text-[11px] text-muted-foreground">
                                                                            Hadir{' '}
                                                                            {
                                                                                r.presentCount
                                                                            }{' '}
                                                                            ·{' '}
                                                                            {
                                                                                CONDITIONS[
                                                                                    r
                                                                                        .labCondition
                                                                                ]
                                                                            }
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-3 py-3">
                                                                        <ul className="grid gap-1.5">
                                                                            {r.assistants.map(
                                                                                (
                                                                                    a,
                                                                                ) => (
                                                                                    <li
                                                                                        key={
                                                                                            a.id
                                                                                        }
                                                                                        className="flex items-center gap-2 text-xs"
                                                                                    >
                                                                                        <span
                                                                                            aria-hidden
                                                                                            className="flex size-6 items-center justify-center rounded-full bg-primary-800 text-[10px] font-bold text-white"
                                                                                        >
                                                                                            {initials(
                                                                                                a.name,
                                                                                            )}
                                                                                        </span>
                                                                                        {
                                                                                            a.name
                                                                                        }
                                                                                        {a.lead && (
                                                                                            <span className="bg-primary-100 px-1.5 text-[10px] text-primary-800">
                                                                                                PJ
                                                                                            </span>
                                                                                        )}
                                                                                    </li>
                                                                                ),
                                                                            )}
                                                                        </ul>
                                                                    </td>
                                                                    <td className="px-3 py-3 text-xs">
                                                                        {r.material ??
                                                                            '—'}
                                                                    </td>
                                                                    <td className="max-w-72 px-3 py-3 text-xs leading-relaxed">
                                                                        {
                                                                            r.notes
                                                                        }
                                                                        {r.returnNote && (
                                                                            <span className="mt-2 block border-l-2 border-danger bg-danger-soft px-2 py-1 text-danger">
                                                                                Catatan
                                                                                Sekretaris:{' '}
                                                                                {
                                                                                    r.returnNote
                                                                                }
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-3">
                                                                        {r.photo ? (
                                                                            <a
                                                                                href={
                                                                                    r
                                                                                        .photo
                                                                                        .url
                                                                                }
                                                                                target="_blank"
                                                                                rel="noreferrer"
                                                                                className="inline-flex items-center gap-1 text-xs text-primary-700 underline"
                                                                            >
                                                                                <ImageIcon
                                                                                    className="size-4"
                                                                                    aria-hidden
                                                                                />{' '}
                                                                                Foto
                                                                            </a>
                                                                        ) : (
                                                                            <span className="text-xs text-muted-foreground">
                                                                                —
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-3">
                                                                        <div className="grid justify-items-start gap-1.5">
                                                                            <Badge
                                                                                variant={
                                                                                    STATUS[
                                                                                        r
                                                                                            .status
                                                                                    ]
                                                                                        .variant
                                                                                }
                                                                            >
                                                                                {
                                                                                    STATUS[
                                                                                        r
                                                                                            .status
                                                                                    ]
                                                                                        .label
                                                                                }
                                                                            </Badge>
                                                                            {r.locked &&
                                                                                r.status !==
                                                                                    'verified' && (
                                                                                    <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                                                                        <Lock
                                                                                            className="size-3"
                                                                                            aria-hidden
                                                                                        />{' '}
                                                                                        Terkunci
                                                                                    </span>
                                                                                )}
                                                                            {r.verifier &&
                                                                                r.status ===
                                                                                    'verified' && (
                                                                                    <span className="text-[11px] text-muted-foreground">
                                                                                        oleh{' '}
                                                                                        {
                                                                                            r.verifier
                                                                                        }
                                                                                    </span>
                                                                                )}
                                                                            {filters.tab !==
                                                                                'mine' && (
                                                                                <span className="text-[11px] text-muted-foreground">
                                                                                    Pembuat:{' '}
                                                                                    {
                                                                                        r.author
                                                                                    }
                                                                                </span>
                                                                            )}
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {r.canEdit && (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        onClick={() => {
                                                                                            setEditing(
                                                                                                r,
                                                                                            );
                                                                                            setFormOpen(
                                                                                                true,
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        <Pencil />{' '}
                                                                                        Ubah
                                                                                    </Button>
                                                                                )}
                                                                                {r.canEdit &&
                                                                                    r.status ===
                                                                                        'draft' && (
                                                                                        <Button
                                                                                            size="icon"
                                                                                            variant="ghost"
                                                                                            aria-label="Hapus draft"
                                                                                            onClick={() =>
                                                                                                router.delete(
                                                                                                    ReportController.destroy.url(
                                                                                                        r.id,
                                                                                                    ),
                                                                                                    {
                                                                                                        preserveScroll: true,
                                                                                                    },
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Trash2 />
                                                                                        </Button>
                                                                                    )}
                                                                                {r.canReview && (
                                                                                    <>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            onClick={() =>
                                                                                                act(
                                                                                                    ReportController.verify.url(
                                                                                                        r.id,
                                                                                                    ),
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Send />{' '}
                                                                                            Verifikasi
                                                                                        </Button>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            onClick={() =>
                                                                                                setReturning(
                                                                                                    r,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Undo2 />{' '}
                                                                                            Kembalikan
                                                                                        </Button>
                                                                                    </>
                                                                                )}
                                                                                {r.canUnlock && (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        onClick={() =>
                                                                                            act(
                                                                                                ReportController.unlock.url(
                                                                                                    r.id,
                                                                                                ),
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <LockOpen />{' '}
                                                                                        Buka
                                                                                        Kunci
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                            {r.canEdit && (
                                                                                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                                    <Clock
                                                                                        className="size-3"
                                                                                        aria-hidden
                                                                                    />{' '}
                                                                                    terkunci{' '}
                                                                                    {formatRelative(
                                                                                        r.editableUntil,
                                                                                    )}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ),
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            </div>
            {formOpen && (
                <ReportFormDialog
                    key={editing?.id ?? 'new'}
                    open={formOpen}
                    onOpenChange={setFormOpen}
                    report={editing}
                    props={props}
                />
            )}
            <ReturnDialog
                key={returning?.id ?? 0}
                report={returning}
                onClose={() => setReturning(null)}
            />
        </>
    );
}
