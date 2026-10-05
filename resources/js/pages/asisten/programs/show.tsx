import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowLeft,
    ArrowUp,
    Check,
    CheckCircle2,
    Circle,
    Download,
    GripVertical,
    Lock,
    Pencil,
    Plus,
    Rocket,
    Save,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import { Fragment, useState } from 'react';
import ProgramController from '@/actions/App/Http/Controllers/Asisten/ProgramController';
import { EmptyState } from '@/components/empty-state';
import InputError from '@/components/input-error';
import { ProgramFormDialog } from '@/components/programs/program-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { PROGRAM_STATUS, REGISTRATION_STATUS } from '@/types';
import type {
    ProgramCard,
    ProgramField,
    ProgramOptions,
    ProgramStageRow,
    RegistrationStatus,
} from '@/types';

type Registration = {
    id: number;
    name: string;
    nim: string | null;
    email: string;
    major: string | null;
    status: RegistrationStatus;
    attended: boolean;
    stageId: number | null;
    stageResults: Record<
        string,
        {
            result: 'pass' | 'fail';
            note: string | null;
            by: string | null;
            at: string;
        }
    >;
    answers: {
        label: string;
        value: string | number | { name: string; url: string } | null;
    }[];
    createdAt: string;
};

type Props = {
    program: ProgramCard & {
        facilities: string[];
        requirements: string[];
        ready: boolean;
    };
    stages: (ProgramStageRow & { id: number })[];
    fields: ProgramField[];
    readiness: { key: string; label: string; done: boolean }[];
    registrations: Registration[];
    archive: {
        id: number;
        title: string;
        year: number;
        applicants: number;
        accepted: number;
    }[];
    options: ProgramOptions;
};

const TYPE_LABEL = {
    workshop: 'Workshop',
    quick_tutor: 'Quick Tutor',
    recruitment: 'Rekrutmen Asisten',
    maintenance: 'Maintenance',
} as const;
const FIELD_TYPES = [
    ['text', 'Teks singkat'],
    ['textarea', 'Paragraf'],
    ['number', 'Angka'],
    ['select', 'Pilihan'],
    ['file', 'File / Dokumen'],
] as const;

function Answers({ answers }: { answers: Registration['answers'] }) {
    return (
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
            {answers.map((a) => (
                <div key={a.label}>
                    <dt className="text-muted-foreground">{a.label}</dt>
                    <dd className="font-medium break-words">
                        {a.value && typeof a.value === 'object' ? (
                            <a
                                href={a.value.url}
                                className="text-primary-700 underline"
                            >
                                {a.value.name}
                            </a>
                        ) : (
                            (a.value ?? '—')
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/** FR-APR-02: peserta + presensi (Workshop / Quick Tutor). */
function Participants({
    program,
    registrations,
}: Pick<Props, 'program' | 'registrations'>) {
    const [open, setOpen] = useState<number | null>(null);
    const attended = registrations.filter((r) => r.attended).length;

    if (registrations.length === 0) {
        return (
            <EmptyState
                icon={Users}
                title="Belum ada peserta"
                description={
                    program.status === 'open'
                        ? 'Bagikan tautan registrasi kepada praktikan.'
                        : 'Publikasikan program agar praktikan dapat mendaftar.'
                }
            />
        );
    }

    return (
        <div className="grid gap-3">
            <p className="text-sm text-muted-foreground">
                {registrations.length} peserta · hadir{' '}
                <strong className="text-foreground">{attended}</strong>
            </p>
            <div className="overflow-x-auto border bg-card">
                <table className="w-full min-w-[48rem] text-sm">
                    <thead className="bg-primary-50 text-left font-mono text-xs">
                        <tr>
                            <th className="px-4 py-3">NIM</th>
                            <th className="px-3 py-3">Nama</th>
                            <th className="px-3 py-3">Email</th>
                            <th className="px-3 py-3">Mendaftar</th>
                            <th className="px-3 py-3 text-center">Hadir</th>
                            <th className="px-3 py-3" />
                        </tr>
                    </thead>
                    <tbody>
                        {registrations.map((r) => (
                            <Fragment key={r.id}>
                                <tr className="border-t">
                                    <td className="px-4 py-2.5 font-mono text-xs text-primary-700">
                                        {r.nim}
                                    </td>
                                    <td className="px-3 py-2.5">{r.name}</td>
                                    <td className="px-3 py-2.5 text-xs">
                                        {r.email}
                                    </td>
                                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                                        {formatRelative(r.createdAt)}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                        <Checkbox
                                            aria-label={`Hadir: ${r.name}`}
                                            checked={r.attended}
                                            onCheckedChange={(c) =>
                                                router.post(
                                                    ProgramController.attendance.url(
                                                        r.id,
                                                    ),
                                                    { attended: c === true },
                                                    { preserveScroll: true },
                                                )
                                            }
                                        />
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            aria-expanded={open === r.id}
                                            onClick={() =>
                                                setOpen(
                                                    open === r.id ? null : r.id,
                                                )
                                            }
                                        >
                                            Jawaban
                                        </Button>
                                    </td>
                                </tr>
                                {open === r.id && (
                                    <tr className="bg-muted/30">
                                        <td colSpan={6} className="px-4 py-3">
                                            <Answers answers={r.answers} />
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/** FR-APR-03-5: pipeline pelamar per tahap. */
function Pipeline({
    stages,
    registrations,
}: Pick<Props, 'stages' | 'registrations'>) {
    const [stageFilter, setStageFilter] = useState<number | 'all' | 'done'>(
        'all',
    );
    const [reviewing, setReviewing] = useState<{
        r: Registration;
        pass: boolean;
    } | null>(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const finished = (r: Registration) =>
        ['accepted', 'rejected', 'cancelled'].includes(r.status);
    const shown = registrations.filter((r) =>
        stageFilter === 'all'
            ? true
            : stageFilter === 'done'
              ? finished(r)
              : !finished(r) && r.stageId === stageFilter,
    );

    if (stages.length === 0) {
        return (
            <EmptyState
                icon={Users}
                title="Timeline belum dibuat"
                description="Susun tahapan seleksi di tab Timeline & Persyaratan."
            />
        );
    }

    return (
        <div className="grid gap-4">
            <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Filter tahap"
            >
                {[
                    {
                        id: 'all' as const,
                        name: 'Semua',
                        count: registrations.length,
                    },
                    ...stages.map((s) => ({
                        id: s.id,
                        name: s.name,
                        count: registrations.filter(
                            (r) => !finished(r) && r.stageId === s.id,
                        ).length,
                    })),
                    {
                        id: 'done' as const,
                        name: 'Selesai',
                        count: registrations.filter(finished).length,
                    },
                ].map((s, i, all) => (
                    <Fragment key={s.id}>
                        <button
                            type="button"
                            aria-pressed={stageFilter === s.id}
                            onClick={() => setStageFilter(s.id)}
                            className={cn(
                                'flex items-center gap-2 border px-3 py-1.5 text-sm',
                                stageFilter === s.id
                                    ? 'border-primary-800 bg-primary-800 text-white'
                                    : 'bg-card hover:bg-primary-50',
                            )}
                        >
                            {s.name}
                            <span
                                className={cn(
                                    'rounded-full px-1.5 text-[11px]',
                                    stageFilter === s.id
                                        ? 'bg-white/20'
                                        : 'bg-primary-100',
                                )}
                            >
                                {s.count}
                            </span>
                        </button>
                        {i > 0 && i < all.length - 2 && (
                            <span
                                aria-hidden
                                className="self-center text-muted-foreground"
                            >
                                →
                            </span>
                        )}
                    </Fragment>
                ))}
            </div>
            {shown.length === 0 ? (
                <p className="border bg-card p-4 text-sm text-muted-foreground">
                    Tidak ada pelamar pada tahap ini.
                </p>
            ) : (
                <ul className="grid gap-3">
                    {shown.map((r) => {
                        const stage = stages.find((s) => s.id === r.stageId);

                        return (
                            <li
                                key={r.id}
                                className="grid gap-3 border bg-card p-4"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <p className="font-bold">{r.name}</p>
                                        <p className="font-mono text-xs text-muted-foreground">
                                            {r.nim} · {r.major ?? '—'} ·{' '}
                                            {r.email}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {stage && !finished(r) && (
                                            <Badge variant="outline">
                                                Tahap: {stage.name}
                                            </Badge>
                                        )}
                                        <Badge
                                            variant={
                                                REGISTRATION_STATUS[r.status]
                                                    .variant
                                            }
                                        >
                                            {
                                                REGISTRATION_STATUS[r.status]
                                                    .label
                                            }
                                        </Badge>
                                    </div>
                                </div>
                                <Answers answers={r.answers} />
                                {Object.keys(r.stageResults).length > 0 && (
                                    <ol className="grid gap-1 border-t pt-2 text-xs">
                                        {stages
                                            .filter((s) => r.stageResults[s.id])
                                            .map((s) => (
                                                <li
                                                    key={s.id}
                                                    className="flex flex-wrap gap-2"
                                                >
                                                    {r.stageResults[s.id]
                                                        .result === 'pass' ? (
                                                        <Check
                                                            className="size-3.5 text-success"
                                                            aria-label="Lolos"
                                                        />
                                                    ) : (
                                                        <X
                                                            className="size-3.5 text-danger"
                                                            aria-label="Tidak lolos"
                                                        />
                                                    )}
                                                    <strong>{s.name}</strong>
                                                    <span className="text-muted-foreground">
                                                        {
                                                            r.stageResults[s.id]
                                                                .by
                                                        }{' '}
                                                        {r.stageResults[s.id]
                                                            .note &&
                                                            `— “${r.stageResults[s.id].note}”`}
                                                    </span>
                                                </li>
                                            ))}
                                    </ol>
                                )}
                                {!finished(r) && (
                                    <div className="flex gap-2">
                                        <Button
                                            size="sm"
                                            onClick={() =>
                                                setReviewing({ r, pass: true })
                                            }
                                        >
                                            <Check /> Lolos {stage?.name}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                setReviewing({ r, pass: false })
                                            }
                                        >
                                            <X /> Tidak Lolos
                                        </Button>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            <Dialog
                open={reviewing !== null}
                onOpenChange={(o) => !o && setReviewing(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {reviewing?.pass
                                ? 'Loloskan pelamar'
                                : 'Tidak loloskan pelamar'}
                        </DialogTitle>
                        <DialogDescription>
                            {reviewing?.r.name} — pelamar menerima notifikasi
                            status.{' '}
                            {reviewing?.pass
                                ? 'Pelamar maju ke tahap berikutnya.'
                                : 'Status menjadi Ditolak.'}
                        </DialogDescription>
                    </DialogHeader>
                    <Label htmlFor="review-note">
                        Catatan penilai (opsional)
                    </Label>
                    <Textarea
                        id="review-note"
                        maxLength={500}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setReviewing(null)}
                        >
                            Batal
                        </Button>
                        <Button
                            variant={
                                reviewing?.pass ? 'default' : 'destructive'
                            }
                            disabled={busy}
                            onClick={() => {
                                if (!reviewing) return;
                                setBusy(true);
                                router.post(
                                    ProgramController.review.url(
                                        reviewing.r.id,
                                    ),
                                    { pass: reviewing.pass, note },
                                    {
                                        preserveScroll: true,
                                        onFinish: () => {
                                            setBusy(false);
                                            setReviewing(null);
                                            setNote('');
                                        },
                                    },
                                );
                            }}
                        >
                            {busy && <Spinner />} Simpan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/** FR-APR-03-3: form builder. */
function FormBuilder({
    program,
    fields,
    locked,
}: {
    program: Props['program'];
    fields: ProgramField[];
    locked: boolean;
}) {
    const blank: ProgramField = {
        label: '',
        type: 'text',
        required: true,
        options: [],
        formats: ['pdf'],
        maxMb: 5,
    };
    const form = useForm<{ fields: ProgramField[] }>({ fields });
    const set = (i: number, patch: Partial<ProgramField>) =>
        form.setData(
            'fields',
            form.data.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)),
        );
    const move = (i: number, d: number) => {
        const next = [...form.data.fields];
        [next[i], next[i + d]] = [next[i + d], next[i]];
        form.setData('fields', next);
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.transform((d) => ({
                    fields: d.fields.map((f) => ({
                        label: f.label,
                        type: f.type,
                        required: f.required,
                        options: f.options,
                        formats: f.formats,
                        max_mb: f.maxMb,
                    })),
                }));
                form.put(ProgramController.updateFields.url(program.id), {
                    preserveScroll: true,
                });
            }}
            className="grid gap-4"
        >
            {locked && (
                <p className="flex items-center gap-2 border border-warning/40 bg-warning-soft p-3 text-sm text-warning">
                    <Lock className="size-4" aria-hidden /> Form terkunci karena
                    sudah ada pendaftar.
                </p>
            )}
            <InputError
                message={(form.errors as Record<string, string>).fields}
            />
            <ol className="grid gap-3">
                {form.data.fields.map((f, i) => (
                    <li key={i} className="grid gap-3 border bg-card p-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <span className="pb-2 font-mono text-xs text-muted-foreground">
                                #{i + 1}
                            </span>
                            <div className="grid min-w-56 flex-1 gap-1">
                                <Label
                                    htmlFor={`f-label-${i}`}
                                    className="text-xs"
                                >
                                    Label
                                </Label>
                                <Input
                                    id={`f-label-${i}`}
                                    required
                                    disabled={locked}
                                    value={f.label}
                                    onChange={(e) =>
                                        set(i, { label: e.target.value })
                                    }
                                    placeholder="Mis. IPK terakhir"
                                />
                            </div>
                            <div className="grid gap-1">
                                <Label
                                    htmlFor={`f-type-${i}`}
                                    className="text-xs"
                                >
                                    Jenis
                                </Label>
                                <select
                                    id={`f-type-${i}`}
                                    disabled={locked}
                                    value={f.type}
                                    onChange={(e) =>
                                        set(i, {
                                            type: e.target
                                                .value as ProgramField['type'],
                                        })
                                    }
                                    className="h-10 border border-input bg-white px-3 text-sm"
                                >
                                    {FIELD_TYPES.map(([v, l]) => (
                                        <option key={v} value={v}>
                                            {l}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <label className="flex items-center gap-2 pb-2.5 text-sm">
                                <Checkbox
                                    disabled={locked}
                                    checked={f.required}
                                    onCheckedChange={(c) =>
                                        set(i, { required: c === true })
                                    }
                                />{' '}
                                Wajib
                            </label>
                            {!locked && (
                                <div className="flex gap-1 pb-1">
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={i === 0}
                                        onClick={() => move(i, -1)}
                                        aria-label="Naikkan"
                                    >
                                        <ArrowUp />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        disabled={
                                            i === form.data.fields.length - 1
                                        }
                                        onClick={() => move(i, 1)}
                                        aria-label="Turunkan"
                                    >
                                        <ArrowDown />
                                    </Button>
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() =>
                                            form.setData(
                                                'fields',
                                                form.data.fields.filter(
                                                    (_, j) => j !== i,
                                                ),
                                            )
                                        }
                                        aria-label="Hapus field"
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            )}
                        </div>
                        {f.type === 'select' && (
                            <div className="grid gap-1">
                                <Label
                                    htmlFor={`f-opt-${i}`}
                                    className="text-xs"
                                >
                                    Pilihan (pisahkan dengan koma)
                                </Label>
                                <Input
                                    id={`f-opt-${i}`}
                                    disabled={locked}
                                    value={f.options.join(', ')}
                                    onChange={(e) =>
                                        set(i, {
                                            options: e.target.value
                                                .split(',')
                                                .map((o) => o.trimStart()),
                                        })
                                    }
                                    placeholder="Python, Java, Go"
                                />
                            </div>
                        )}
                        {f.type === 'file' && (
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                                <span className="text-xs text-muted-foreground">
                                    Format:
                                </span>
                                {['pdf', 'zip', 'jpg', 'png'].map((fmt) => (
                                    <label
                                        key={fmt}
                                        className="flex items-center gap-1.5 uppercase"
                                    >
                                        <Checkbox
                                            disabled={locked}
                                            checked={f.formats.includes(fmt)}
                                            onCheckedChange={(c) =>
                                                set(i, {
                                                    formats: c
                                                        ? [...f.formats, fmt]
                                                        : f.formats.filter(
                                                              (x) => x !== fmt,
                                                          ),
                                                })
                                            }
                                        />
                                        {fmt}
                                    </label>
                                ))}
                                <label className="flex items-center gap-2 text-xs">
                                    Maks
                                    <Input
                                        type="number"
                                        min={1}
                                        max={20}
                                        disabled={locked}
                                        value={f.maxMb}
                                        onChange={(e) =>
                                            set(i, {
                                                maxMb: Number(e.target.value),
                                            })
                                        }
                                        className="h-8 w-16"
                                    />{' '}
                                    MB
                                </label>
                            </div>
                        )}
                    </li>
                ))}
            </ol>
            {!locked && (
                <div className="flex flex-wrap justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                form.setData('fields', [
                                    ...form.data.fields,
                                    blank,
                                ])
                            }
                        >
                            <Plus /> Tambah Field
                        </Button>
                        {program.type === 'recruitment' && (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                    form.setData('fields', [
                                        ...form.data.fields,
                                        {
                                            ...blank,
                                            label: 'CV',
                                            type: 'file',
                                            formats: ['pdf'],
                                            maxMb: 5,
                                        },
                                        {
                                            ...blank,
                                            label: 'Transkrip Nilai',
                                            type: 'file',
                                            formats: ['pdf'],
                                            maxMb: 5,
                                        },
                                        {
                                            ...blank,
                                            label: 'Portofolio',
                                            type: 'file',
                                            required: false,
                                            formats: ['pdf', 'zip'],
                                            maxMb: 10,
                                        },
                                    ])
                                }
                            >
                                + Dokumen wajib (CV, transkrip, portofolio)
                            </Button>
                        )}
                    </div>
                    <Button type="submit" disabled={form.processing}>
                        {form.processing ? <Spinner /> : <Save />} Simpan Form
                    </Button>
                </div>
            )}
        </form>
    );
}

/** FR-APR-03-1/2: timeline (drag untuk mengurutkan) & persyaratan. */
function Timeline({
    program,
    stages,
}: {
    program: Props['program'];
    stages: Props['stages'];
}) {
    const form = useForm<{ stages: ProgramStageRow[]; requirements: string[] }>(
        {
            stages: stages.length
                ? stages
                : [
                      { name: 'Seleksi Berkas', startAt: null, endAt: null },
                      { name: 'Tes Tertulis', startAt: null, endAt: null },
                      { name: 'Tes Coding', startAt: null, endAt: null },
                      { name: 'Wawancara', startAt: null, endAt: null },
                      { name: 'Pengumuman', startAt: null, endAt: null },
                  ],
            requirements: program.requirements.length
                ? program.requirements
                : [''],
        },
    );
    const [drag, setDrag] = useState<number | null>(null);
    const set = (i: number, patch: Partial<ProgramStageRow>) =>
        form.setData(
            'stages',
            form.data.stages.map((s, j) => (j === i ? { ...s, ...patch } : s)),
        );
    const reorder = (from: number, to: number) => {
        const next = [...form.data.stages];
        const [item] = next.splice(from, 1);
        next.splice(to, 0, item);
        form.setData('stages', next);
    };

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                form.transform((d) => ({
                    stages: d.stages.map((s) => ({
                        name: s.name,
                        start_at: s.startAt || null,
                        end_at: s.endAt || null,
                    })),
                    requirements: d.requirements.filter((r) => r.trim()),
                }));
                form.put(ProgramController.updateStages.url(program.id), {
                    preserveScroll: true,
                });
            }}
            className="grid gap-6 lg:grid-cols-[3fr_2fr]"
        >
            <section className="grid content-start gap-3">
                <h3 className="font-bold">Timeline Seleksi</h3>
                <p className="-mt-2 text-xs text-muted-foreground">
                    Seret untuk mengubah urutan tahap.
                </p>
                <ol className="grid gap-2">
                    {form.data.stages.map((s, i) => (
                        <li
                            key={i}
                            draggable
                            onDragStart={() => setDrag(i)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={() => {
                                if (drag !== null && drag !== i)
                                    reorder(drag, i);
                                setDrag(null);
                            }}
                            className={cn(
                                'flex flex-wrap items-center gap-2 border bg-card p-3',
                                drag === i && 'opacity-50',
                            )}
                        >
                            <GripVertical
                                className="size-4 cursor-grab text-muted-foreground"
                                aria-hidden
                            />
                            <span className="flex size-6 items-center justify-center rounded-full bg-primary-800 font-mono text-xs text-white">
                                {i + 1}
                            </span>
                            <Input
                                aria-label={`Nama tahap ${i + 1}`}
                                required
                                value={s.name}
                                onChange={(e) =>
                                    set(i, { name: e.target.value })
                                }
                                className="min-w-40 flex-1"
                            />
                            <Input
                                aria-label="Mulai"
                                type="date"
                                value={s.startAt ?? ''}
                                onChange={(e) =>
                                    set(i, { startAt: e.target.value })
                                }
                                className="w-40"
                            />
                            <Input
                                aria-label="Selesai"
                                type="date"
                                value={s.endAt ?? ''}
                                onChange={(e) =>
                                    set(i, { endAt: e.target.value })
                                }
                                className="w-40"
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                disabled={i === 0}
                                onClick={() => reorder(i, i - 1)}
                                aria-label="Naikkan"
                            >
                                <ArrowUp />
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                    form.setData(
                                        'stages',
                                        form.data.stages.filter(
                                            (_, j) => j !== i,
                                        ),
                                    )
                                }
                                aria-label="Hapus tahap"
                            >
                                <Trash2 />
                            </Button>
                        </li>
                    ))}
                </ol>
                <InputError
                    message={(form.errors as Record<string, string>).stages}
                />
                <Button
                    type="button"
                    variant="outline"
                    className="w-fit"
                    onClick={() =>
                        form.setData('stages', [
                            ...form.data.stages,
                            { name: '', startAt: null, endAt: null },
                        ])
                    }
                >
                    <Plus /> Tambah Tahap
                </Button>
            </section>
            <section className="grid content-start gap-3">
                <h3 className="font-bold">Persyaratan Kualifikasi Teknis</h3>
                <ul className="grid gap-2">
                    {form.data.requirements.map((r, i) => (
                        <li key={i} className="flex gap-2">
                            <Input
                                aria-label={`Persyaratan ${i + 1}`}
                                value={r}
                                onChange={(e) =>
                                    form.setData(
                                        'requirements',
                                        form.data.requirements.map((x, j) =>
                                            j === i ? e.target.value : x,
                                        ),
                                    )
                                }
                                placeholder="Mis. IPK minimal 3.25"
                            />
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                    form.setData(
                                        'requirements',
                                        form.data.requirements.filter(
                                            (_, j) => j !== i,
                                        ),
                                    )
                                }
                                aria-label="Hapus persyaratan"
                            >
                                <Trash2 />
                            </Button>
                        </li>
                    ))}
                </ul>
                <Button
                    type="button"
                    variant="outline"
                    className="w-fit"
                    onClick={() =>
                        form.setData('requirements', [
                            ...form.data.requirements,
                            '',
                        ])
                    }
                >
                    <Plus /> Tambah Persyaratan
                </Button>
                <Button
                    type="submit"
                    className="mt-4 w-fit"
                    disabled={form.processing}
                >
                    {form.processing ? <Spinner /> : <Save />} Simpan Timeline
                    &amp; Persyaratan
                </Button>
            </section>
        </form>
    );
}

/** Asisten › Program › kelola (FR-APR-02/03). */
export default function ProgramShow(props: Props) {
    const {
        program,
        stages,
        fields,
        readiness,
        registrations,
        archive,
        options,
    } = props;
    const recruitment = program.type === 'recruitment';
    const tabs = recruitment
        ? ([
              ['pipeline', 'Pipeline Pelamar'],
              ['timeline', 'Timeline & Persyaratan'],
              ['form', 'Form Pendaftaran'],
          ] as const)
        : ([
              ['participants', 'Peserta & Presensi'],
              ['form', 'Form Pendaftaran'],
          ] as const);
    const [tab, setTab] = useState<string>(tabs[0][0]);
    const status = (s: string) =>
        router.post(
            ProgramController.status.url(program.id),
            { status: s },
            { preserveScroll: true },
        );
    const type = {
        value: program.type,
        slug: program.typeSlug,
        label: TYPE_LABEL[program.type],
    };

    return (
        <>
            <Head title={program.title} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <Link
                    href={ProgramController.index.url(program.typeSlug)}
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
                >
                    <ArrowLeft className="size-4" aria-hidden /> {type.label}
                </Link>
                <div className="flex flex-col gap-4 border-b border-primary-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">
                                {recruitment ? 'Command Center' : type.label}
                            </Badge>
                            <Badge
                                variant={PROGRAM_STATUS[program.status].variant}
                            >
                                {PROGRAM_STATUS[program.status].label}
                            </Badge>
                        </div>
                        <h1 className="text-h1 font-bold text-primary-900">
                            {program.title}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {program.registered}
                            {program.quota ? ` / ${program.quota}` : ''}{' '}
                            {recruitment ? 'pelamar' : 'peserta'}
                            {program.closesAt &&
                                ` · pendaftaran ditutup ${new Date(program.closesAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <ProgramFormDialog
                            type={type}
                            program={program}
                            options={options}
                            trigger={
                                <Button variant="outline">
                                    <Pencil /> Ubah Detail
                                </Button>
                            }
                        />
                        {program.registered > 0 && (
                            <Button variant="outline" asChild>
                                <a
                                    href={ProgramController.export.url(
                                        program.id,
                                    )}
                                >
                                    <Download /> Ekspor Peserta
                                </a>
                            </Button>
                        )}
                        {program.status === 'draft' && (
                            <Button
                                onClick={() => status('open')}
                                disabled={recruitment && !program.ready}
                                title={
                                    recruitment && !program.ready
                                        ? 'Lengkapi checklist kesiapan terlebih dahulu'
                                        : undefined
                                }
                            >
                                <Rocket />{' '}
                                {recruitment
                                    ? 'Buka Rekrutmen'
                                    : 'Publikasikan'}
                            </Button>
                        )}
                        {program.status === 'open' && (
                            <Button
                                variant="outline"
                                onClick={() => status('closed')}
                            >
                                <Lock /> Tutup Pendaftaran
                            </Button>
                        )}
                        {program.status === 'closed' && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => status('open')}
                                >
                                    Buka Kembali
                                </Button>
                                <Button
                                    onClick={() =>
                                        confirm(
                                            'Tandai program selesai dan arsipkan? Tindakan ini tidak dapat dibatalkan.',
                                        ) && status('finished')
                                    }
                                >
                                    <CheckCircle2 /> Selesai &amp; Arsipkan
                                </Button>
                            </>
                        )}
                        {program.registered === 0 && (
                            <Button
                                variant="ghost"
                                onClick={() =>
                                    confirm('Hapus program ini?') &&
                                    router.delete(
                                        ProgramController.destroy.url(
                                            program.id,
                                        ),
                                    )
                                }
                                aria-label="Hapus program"
                            >
                                <Trash2 />
                            </Button>
                        )}
                    </div>
                </div>

                {recruitment && program.status === 'draft' && (
                    <section
                        aria-labelledby="ready-title"
                        className="border-primary-300 grid gap-3 border bg-primary-50 p-5"
                    >
                        <h2 id="ready-title" className="font-bold">
                            Checklist Kesiapan · Mode Persiapan
                        </h2>
                        <ul className="grid gap-2 sm:grid-cols-2">
                            {readiness.map((r) => (
                                <li
                                    key={r.key}
                                    className="flex items-center gap-2 text-sm"
                                >
                                    {r.done ? (
                                        <CheckCircle2
                                            className="size-4 text-success"
                                            aria-label="Selesai"
                                        />
                                    ) : (
                                        <Circle
                                            className="size-4 text-muted-foreground"
                                            aria-label="Belum"
                                        />
                                    )}
                                    <span
                                        className={cn(
                                            !r.done && 'text-muted-foreground',
                                        )}
                                    >
                                        {r.label}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-xs text-muted-foreground">
                            Tombol "Buka Rekrutmen" aktif setelah semua butir
                            terpenuhi. Pelamar wajib login dengan akun
                            Praktikan.
                        </p>
                    </section>
                )}

                <div
                    role="tablist"
                    className="flex gap-6 border-b border-primary-200"
                >
                    {tabs.map(([value, label]) => (
                        <button
                            key={value}
                            role="tab"
                            aria-selected={tab === value}
                            onClick={() => setTab(value)}
                            className={cn(
                                '-mb-px border-b-2 px-1 pb-2.5 text-sm font-bold',
                                tab === value
                                    ? 'border-primary-700 text-primary-800'
                                    : 'border-transparent text-muted-foreground',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'participants' && (
                    <Participants
                        program={program}
                        registrations={registrations}
                    />
                )}
                {tab === 'pipeline' && (
                    <Pipeline stages={stages} registrations={registrations} />
                )}
                {tab === 'timeline' && (
                    <Timeline program={program} stages={stages} />
                )}
                {tab === 'form' && (
                    <FormBuilder
                        program={program}
                        fields={fields}
                        locked={program.registered > 0}
                    />
                )}

                {recruitment && archive.length > 0 && (
                    <section
                        aria-labelledby="archive-title"
                        className="grid gap-3"
                    >
                        <h2 id="archive-title" className="text-h3 font-bold">
                            Arsip Rekrutmen
                        </h2>
                        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {archive.map((a) => (
                                <li key={a.id}>
                                    <Link
                                        href={ProgramController.show.url(a.id)}
                                        className="grid gap-1 border bg-card p-4 hover:bg-primary-50"
                                    >
                                        <span className="font-mono text-xs text-muted-foreground">
                                            {a.year}
                                        </span>
                                        <span className="font-bold">
                                            {a.title}
                                        </span>
                                        <span className="text-sm">
                                            {a.applicants} pelamar ·{' '}
                                            <strong className="text-success">
                                                {a.accepted} diterima
                                            </strong>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </>
    );
}
