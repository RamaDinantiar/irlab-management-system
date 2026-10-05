import { Head, Link, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    Check,
    CheckCircle2,
    Circle,
    ListChecks,
    MapPin,
    Send,
    Ticket,
    User,
    Users,
    X,
} from 'lucide-react';
import type { FormEvent } from 'react';
import ProgramController from '@/actions/App/Http/Controllers/Praktikan/ProgramController';
import InputError from '@/components/input-error';
import { Markdown } from '@/components/markdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { PROGRAM_STATUS, REGISTRATION_STATUS } from '@/types';
import type {
    ProgramCard,
    ProgramField,
    ProgramStageRow,
    RegistrationStatus,
} from '@/types';

type Props = {
    program: ProgramCard & {
        facilities: string[];
        requirements: string[];
        full: boolean;
    };
    stages: (ProgramStageRow & { id: number })[];
    fields: (ProgramField & { id: number })[];
    registration: {
        status: RegistrationStatus;
        stageId: number | null;
        stageResults: Record<string, { result: 'pass' | 'fail'; at: string }>;
        createdAt: string;
    } | null;
};

const longDate = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '—';
const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

function RegistrationForm({
    program,
    fields,
}: Pick<Props, 'program' | 'fields'>) {
    const form = useForm<{ answers: Record<string, string | File | null> }>({
        answers: Object.fromEntries(
            fields.map((f) => [String(f.id), f.type === 'file' ? null : '']),
        ),
    });
    const errors = form.errors as Record<string, string>;
    const set = (id: number, value: string | File | null) =>
        form.setData('answers', { ...form.data.answers, [String(id)]: value });

    return (
        <form
            onSubmit={(e: FormEvent) => {
                e.preventDefault();
                form.post(ProgramController.register.url(program.id), {
                    forceFormData: true,
                    preserveScroll: true,
                });
            }}
            className="grid gap-4"
        >
            {fields.map((f) => {
                const id = `ans-${f.id}`;
                const value = form.data.answers[String(f.id)];

                return (
                    <div key={f.id} className="grid gap-2">
                        <Label htmlFor={id}>
                            {f.label}{' '}
                            {f.required && (
                                <span className="text-destructive">*</span>
                            )}
                        </Label>
                        {f.type === 'textarea' ? (
                            <Textarea
                                id={id}
                                required={f.required}
                                maxLength={3000}
                                value={(value as string) ?? ''}
                                onChange={(e) => set(f.id, e.target.value)}
                            />
                        ) : f.type === 'select' ? (
                            <select
                                id={id}
                                required={f.required}
                                value={(value as string) ?? ''}
                                onChange={(e) => set(f.id, e.target.value)}
                                className="h-10 border border-input bg-white px-3 text-sm"
                            >
                                <option value="">Pilih…</option>
                                {f.options.map((o) => (
                                    <option key={o} value={o}>
                                        {o}
                                    </option>
                                ))}
                            </select>
                        ) : f.type === 'file' ? (
                            <>
                                <Input
                                    id={id}
                                    type="file"
                                    required={f.required}
                                    accept={f.formats
                                        .map((x) => `.${x}`)
                                        .join(',')}
                                    onChange={(e) =>
                                        set(f.id, e.target.files?.[0] ?? null)
                                    }
                                />
                                <span className="text-[11px] text-muted-foreground">
                                    {f.formats
                                        .map((x) => x.toUpperCase())
                                        .join(', ')}{' '}
                                    · maks {f.maxMb} MB
                                </span>
                            </>
                        ) : (
                            <Input
                                id={id}
                                type={f.type === 'number' ? 'number' : 'text'}
                                step="any"
                                required={f.required}
                                maxLength={255}
                                value={(value as string) ?? ''}
                                onChange={(e) => set(f.id, e.target.value)}
                            />
                        )}
                        <InputError message={errors[`answers.${f.id}`]} />
                    </div>
                );
            })}
            <InputError message={errors.program} />
            <Button type="submit" disabled={form.processing} className="w-fit">
                {form.processing ? <Spinner /> : <Send />} Kirim Pendaftaran
            </Button>
        </form>
    );
}

/** Praktikan › detail program + pendaftaran (FR-PP-02/03). */
export default function PraktikanProgramShow({
    program,
    stages,
    fields,
    registration,
}: Props) {
    const recruitment = program.type === 'recruitment';

    return (
        <>
            <Head title={program.title} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <Link
                    href={ProgramController.index.url(program.typeSlug)}
                    className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary-700 hover:underline"
                >
                    <ArrowLeft className="size-4" aria-hidden /> Kembali ke
                    etalase
                </Link>
                <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
                    <article className="grid content-start gap-5">
                        {program.poster && (
                            <img
                                src={program.poster}
                                alt={`Poster ${program.title}`}
                                className="aspect-video w-full border object-cover"
                            />
                        )}
                        <div className="space-y-2">
                            <Badge
                                variant={
                                    program.accepting
                                        ? 'success'
                                        : PROGRAM_STATUS[program.status].variant
                                }
                            >
                                {program.accepting
                                    ? 'Pendaftaran Dibuka'
                                    : PROGRAM_STATUS[program.status].label}
                            </Badge>
                            <h1 className="text-h1 font-bold text-primary-900">
                                {program.title}
                            </h1>
                            {program.category && (
                                <p className="text-sm text-muted-foreground">
                                    {program.category}
                                </p>
                            )}
                        </div>
                        <div className="grid gap-3 border bg-card p-4 text-sm sm:grid-cols-2">
                            {program.speakerName && (
                                <span className="flex gap-2">
                                    <User
                                        className="size-4 text-primary-700"
                                        aria-hidden
                                    />
                                    <span>
                                        <strong className="block">
                                            {program.speakerName}
                                        </strong>
                                        <span className="text-xs text-muted-foreground">
                                            {program.speakerAffiliation}
                                        </span>
                                    </span>
                                </span>
                            )}
                            {program.startsAt && (
                                <span className="flex gap-2">
                                    <CalendarDays
                                        className="size-4 text-primary-700"
                                        aria-hidden
                                    />{' '}
                                    {longDate(program.startsAt)}
                                </span>
                            )}
                            {program.location && (
                                <span className="flex gap-2">
                                    <MapPin
                                        className="size-4 text-primary-700"
                                        aria-hidden
                                    />{' '}
                                    {program.mode === 'online'
                                        ? 'Online (tautan dikirim ke peserta)'
                                        : program.location}
                                </span>
                            )}
                            <span className="flex gap-2">
                                <Users
                                    className="size-4 text-primary-700"
                                    aria-hidden
                                />{' '}
                                {program.registered}
                                {program.quota
                                    ? ` / ${program.quota}`
                                    : ''}{' '}
                                pendaftar
                            </span>
                            {(program.feeInternal ?? 0) > 0 && (
                                <span className="flex gap-2">
                                    <Ticket
                                        className="size-4 text-primary-700"
                                        aria-hidden
                                    />{' '}
                                    {rupiah(program.feeInternal!)} (mahasiswa
                                    aktif)
                                </span>
                            )}
                        </div>
                        {program.description && (
                            <Markdown className="text-sm">
                                {program.description}
                            </Markdown>
                        )}
                        {program.facilities.length > 0 && (
                            <ul className="flex flex-wrap gap-2">
                                {program.facilities.map((f) => (
                                    <li
                                        key={f}
                                        className="inline-flex items-center gap-1 bg-primary-50 px-2.5 py-1 text-xs"
                                    >
                                        <Check
                                            className="size-3.5 text-success"
                                            aria-hidden
                                        />{' '}
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        )}
                        {program.requirements.length > 0 && (
                            <section className="grid gap-2">
                                <h2 className="flex items-center gap-2 font-bold">
                                    <ListChecks
                                        className="size-4"
                                        aria-hidden
                                    />{' '}
                                    Persyaratan
                                </h2>
                                <ul className="list-disc pl-5 text-sm">
                                    {program.requirements.map((r) => (
                                        <li key={r}>{r}</li>
                                    ))}
                                </ul>
                            </section>
                        )}
                        {stages.length > 0 && (
                            <section className="grid gap-2">
                                <h2 className="font-bold">Timeline Seleksi</h2>
                                <ol className="grid gap-2">
                                    {stages.map((s, i) => {
                                        const result =
                                            registration?.stageResults[s.id];
                                        const current =
                                            registration?.stageId === s.id &&
                                            !result;

                                        return (
                                            <li
                                                key={s.id}
                                                className={cn(
                                                    'flex items-center gap-3 border bg-card p-3 text-sm',
                                                    current &&
                                                        'border-primary-600 bg-primary-50',
                                                )}
                                            >
                                                {result?.result === 'pass' ? (
                                                    <CheckCircle2
                                                        className="size-5 text-success"
                                                        aria-label="Lolos"
                                                    />
                                                ) : result?.result ===
                                                  'fail' ? (
                                                    <X
                                                        className="size-5 text-danger"
                                                        aria-label="Tidak lolos"
                                                    />
                                                ) : (
                                                    <Circle
                                                        className="size-5 text-muted-foreground"
                                                        aria-hidden
                                                    />
                                                )}
                                                <span className="font-mono text-xs">
                                                    {i + 1}
                                                </span>
                                                <span className="flex-1 font-medium">
                                                    {s.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {s.startAt &&
                                                        new Date(
                                                            s.startAt,
                                                        ).toLocaleDateString(
                                                            'id-ID',
                                                            {
                                                                day: 'numeric',
                                                                month: 'short',
                                                            },
                                                        )}
                                                    {s.endAt &&
                                                        ` – ${new Date(s.endAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`}
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ol>
                            </section>
                        )}
                    </article>

                    <aside className="grid content-start gap-4 border bg-card p-5 lg:sticky lg:top-20">
                        {registration ? (
                            <>
                                <h2 className="text-h3 font-bold">
                                    Pendaftaran Anda
                                </h2>
                                <Badge
                                    variant={
                                        REGISTRATION_STATUS[registration.status]
                                            .variant
                                    }
                                    className="text-sm"
                                >
                                    {
                                        REGISTRATION_STATUS[registration.status]
                                            .label
                                    }
                                </Badge>
                                <p className="text-sm text-muted-foreground">
                                    Terdaftar sejak{' '}
                                    {longDate(registration.createdAt)}.{' '}
                                    {recruitment
                                        ? 'Pantau status tiap tahap di timeline dan notifikasi.'
                                        : 'Informasi pelaksanaan dikirim lewat notifikasi.'}
                                </p>
                            </>
                        ) : program.accepting && !program.full ? (
                            <>
                                <h2 className="text-h3 font-bold">
                                    Formulir Pendaftaran
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Nama, NIM, dan email diambil otomatis dari
                                    akun Anda.
                                </p>
                                <RegistrationForm
                                    program={program}
                                    fields={fields}
                                />
                            </>
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                {program.full
                                    ? 'Kuota program sudah penuh.'
                                    : 'Pendaftaran program ini sedang ditutup.'}
                            </p>
                        )}
                    </aside>
                </div>
            </div>
        </>
    );
}
