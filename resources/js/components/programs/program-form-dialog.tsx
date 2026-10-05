import { useForm } from '@inertiajs/react';
import {
    BookOpen,
    CalendarDays,
    FileText,
    ImagePlus,
    Info,
    Send,
    Ticket,
    UploadCloud,
    User,
    Wrench,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';
import ProgramController from '@/actions/App/Http/Controllers/Asisten/ProgramController';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ProgramCard, ProgramOptions, ProgramTypeInfo } from '@/types';

const FACILITIES = [
    'E-Sertifikat Terverifikasi',
    'Konsumsi Snack & Makan',
    'Modul Repo & Starter Code',
];

const toLocal = (iso: string | null | undefined) => {
    if (!iso) return '';
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());

    return d.toISOString().slice(0, 16);
};

function Section({
    n,
    icon: Icon,
    title,
    children,
}: {
    n: number;
    icon: typeof Info;
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="grid gap-4">
            <h3 className="flex items-center gap-2 border-b pb-2 font-bold text-primary-900">
                <Icon className="size-4 text-primary-700" aria-hidden /> {n}.{' '}
                {title}
            </h3>
            {children}
        </section>
    );
}

/**
 * Figma "Buat Workshop" — dipakai untuk semua jenis program; field
 * menyesuaikan jenis (Rekrutmen tanpa pemateri/biaya, Maintenance = log).
 */
export function ProgramFormDialog({
    type,
    program,
    options,
    trigger,
}: {
    type: ProgramTypeInfo;
    program?: ProgramCard;
    options: ProgramOptions;
    trigger: ReactNode;
}) {
    const [open, setOpen] = useState(false);
    const posterInput = useRef<HTMLInputElement>(null);
    const maintenance = type.value === 'maintenance';
    const recruitment = type.value === 'recruitment';
    const event = !maintenance && !recruitment;

    const form = useForm({
        type: type.value,
        title: program?.title ?? '',
        category: program?.category ?? '',
        description: program?.description ?? '',
        speaker_name: program?.speakerName ?? '',
        speaker_affiliation: program?.speakerAffiliation ?? '',
        mode: program?.mode ?? 'offline',
        location: program?.location ?? '',
        room_id: program?.roomId ? String(program.roomId) : '',
        starts_at: toLocal(program?.startsAt),
        ends_at: toLocal(program?.endsAt),
        quota: program?.quota ? String(program.quota) : '',
        fee_internal:
            program?.feeInternal != null ? String(program.feeInternal) : '',
        fee_external:
            program?.feeExternal != null ? String(program.feeExternal) : '',
        paid: (program?.feeInternal ?? 0) > 0,
        facilities: program?.facilities ?? ([] as string[]),
        opens_at: toLocal(program?.opensAt),
        closes_at: toLocal(program?.closesAt),
        staff_ids: (program?.staffIds ?? []).map(String),
        result_notes: program?.resultNotes ?? '',
        poster: null as File | null,
        intent: 'draft' as 'draft' | 'publish',
    });

    const send = (intent: 'draft' | 'publish') => {
        form.transform((d) => {
            const { paid, ...rest } = d;

            return {
                ...rest,
                intent,
                fee_internal: paid ? d.fee_internal : '',
                fee_external: paid ? d.fee_external : '',
            };
        });
        const url = program
            ? ProgramController.update.url(program.id)
            : ProgramController.store.url();
        form.post(url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                if (!program) form.reset();
            },
        });
    };

    const submit = (e: FormEvent) => {
        e.preventDefault();
        send(program || maintenance || recruitment ? 'draft' : 'publish');
    };

    const title = `${program ? 'Ubah' : 'Buat'} ${maintenance ? 'Log Maintenance' : type.label}`;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[94svh] gap-0 overflow-y-auto p-0 sm:max-w-3xl">
                <DialogHeader className="sticky top-0 z-10 border-b bg-card px-6 pt-6 pb-4">
                    <DialogTitle className="flex flex-wrap items-center gap-3 text-h2">
                        <span className="border-primary-300 flex size-10 items-center justify-center border bg-primary-50 text-primary-700">
                            <FileText className="size-5" aria-hidden />
                        </span>
                        {title}
                        <Badge variant="secondary">
                            {maintenance
                                ? 'Log Internal'
                                : 'Formulir Program Lab'}
                        </Badge>
                    </DialogTitle>
                    <DialogDescription>
                        {maintenance
                            ? 'Catat jadwal perawatan, perangkat yang ditangani, asisten bertugas, dan hasilnya.'
                            : 'Lengkapi formulir untuk mempublikasikan program baru, mengatur kuota pendaftaran, jadwal, dan media pelaksanaan.'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="grid gap-7 px-6 py-6">
                    <Section
                        n={1}
                        icon={maintenance ? Wrench : Info}
                        title={
                            maintenance
                                ? 'Informasi Perawatan'
                                : `Informasi Dasar ${type.label}`
                        }
                    >
                        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                            <div className="grid gap-2">
                                <Label htmlFor="p-title">
                                    {maintenance ? 'Kegiatan' : 'Nama / Judul'}{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="p-title"
                                    required
                                    maxLength={150}
                                    value={form.data.title}
                                    onChange={(e) =>
                                        form.setData('title', e.target.value)
                                    }
                                    placeholder={
                                        maintenance
                                            ? 'Pembersihan & update OS Lab IR 1'
                                            : 'Hands-on Large Language Models & RAG'
                                    }
                                />
                                <InputError message={form.errors.title} />
                            </div>
                            {!maintenance && (
                                <div className="grid gap-2">
                                    <Label htmlFor="p-cat">
                                        Kategori / Sub-Bidang
                                    </Label>
                                    <Input
                                        id="p-cat"
                                        maxLength={100}
                                        value={form.data.category}
                                        onChange={(e) =>
                                            form.setData(
                                                'category',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Artificial Intelligence"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="p-desc">
                                {maintenance
                                    ? 'PC / Perangkat yang Ditangani'
                                    : 'Deskripsi Singkat & Ringkasan Materi'}{' '}
                                {maintenance && (
                                    <span className="text-destructive">*</span>
                                )}
                            </Label>
                            <Textarea
                                id="p-desc"
                                rows={4}
                                maxLength={5000}
                                value={form.data.description}
                                onChange={(e) =>
                                    form.setData('description', e.target.value)
                                }
                                placeholder={
                                    maintenance
                                        ? 'PC-01 s.d. PC-20: update OS, cek RAM; ganti mouse PC-12.'
                                        : 'Pelatihan intensif…'
                                }
                            />
                            <InputError message={form.errors.description} />
                        </div>
                    </Section>

                    {event && (
                        <Section
                            n={2}
                            icon={User}
                            title="Pemateri & Instruktur Lab"
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="p-speaker">
                                        Nama Pemateri
                                    </Label>
                                    <Input
                                        id="p-speaker"
                                        maxLength={120}
                                        value={form.data.speaker_name}
                                        onChange={(e) =>
                                            form.setData(
                                                'speaker_name',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Dr. Ir. Hendra, M.Kom"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="p-aff">
                                        Instansi / Afiliasi
                                    </Label>
                                    <Input
                                        id="p-aff"
                                        maxLength={150}
                                        value={form.data.speaker_affiliation}
                                        onChange={(e) =>
                                            form.setData(
                                                'speaker_affiliation',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Dosen Pembina"
                                    />
                                </div>
                            </div>
                        </Section>
                    )}

                    <Section
                        n={event ? 3 : 2}
                        icon={CalendarDays}
                        title={
                            recruitment
                                ? 'Periode Pendaftaran'
                                : 'Jadwal, Durasi & Lokasi Pelaksanaan'
                        }
                    >
                        {event && (
                            <div
                                role="radiogroup"
                                aria-label="Mode pelaksanaan"
                                className="grid gap-3 sm:grid-cols-2"
                            >
                                {(
                                    [
                                        [
                                            'offline',
                                            'Offline di Lab',
                                            'Praktikum tatap muka langsung di workstation lab',
                                        ],
                                        [
                                            'online',
                                            'Online via Zoom',
                                            'Webinar daring interaktif',
                                        ],
                                    ] as const
                                ).map(([value, label, hint]) => (
                                    <label
                                        key={value}
                                        className={cn(
                                            'flex cursor-pointer items-start gap-3 border p-3 text-sm has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40',
                                            form.data.mode === value
                                                ? 'border-2 border-primary-700 bg-primary-50'
                                                : 'hover:bg-muted/40',
                                        )}
                                    >
                                        <input
                                            type="radio"
                                            name="mode"
                                            checked={form.data.mode === value}
                                            onChange={() =>
                                                form.setData('mode', value)
                                            }
                                            className="mt-1 accent-primary-700"
                                        />
                                        <span className="grid">
                                            <span className="font-medium">
                                                {label}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {hint}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                        {!recruitment && (
                            <div className="grid gap-4 sm:grid-cols-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="p-start">
                                        Mulai{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Input
                                        id="p-start"
                                        type="datetime-local"
                                        required
                                        value={form.data.starts_at}
                                        onChange={(e) =>
                                            form.setData(
                                                'starts_at',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.starts_at}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="p-end">Selesai</Label>
                                    <Input
                                        id="p-end"
                                        type="datetime-local"
                                        value={form.data.ends_at}
                                        onChange={(e) =>
                                            form.setData(
                                                'ends_at',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError message={form.errors.ends_at} />
                                </div>
                                {maintenance ? (
                                    <div className="grid gap-2">
                                        <Label htmlFor="p-room">Ruang</Label>
                                        <select
                                            id="p-room"
                                            value={form.data.room_id}
                                            onChange={(e) =>
                                                form.setData(
                                                    'room_id',
                                                    e.target.value,
                                                )
                                            }
                                            className="h-10 border border-input bg-white px-3 text-sm"
                                        >
                                            <option value="">—</option>
                                            {options.rooms.map((r) => (
                                                <option key={r.id} value={r.id}>
                                                    {r.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="grid gap-2">
                                        <Label htmlFor="p-loc">
                                            Lokasi / Ruang Lab atau Link
                                        </Label>
                                        <Input
                                            id="p-loc"
                                            maxLength={200}
                                            value={form.data.location}
                                            onChange={(e) =>
                                                form.setData(
                                                    'location',
                                                    e.target.value,
                                                )
                                            }
                                            placeholder={
                                                form.data.mode === 'online'
                                                    ? 'https://zoom.us/…'
                                                    : 'Lab IR 1'
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        {!maintenance && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="p-open">
                                        Pendaftaran dibuka
                                    </Label>
                                    <Input
                                        id="p-open"
                                        type="datetime-local"
                                        value={form.data.opens_at}
                                        onChange={(e) =>
                                            form.setData(
                                                'opens_at',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="p-close">
                                        Pendaftaran ditutup
                                    </Label>
                                    <Input
                                        id="p-close"
                                        type="datetime-local"
                                        value={form.data.closes_at}
                                        onChange={(e) =>
                                            form.setData(
                                                'closes_at',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <InputError
                                        message={form.errors.closes_at}
                                    />
                                </div>
                            </div>
                        )}
                    </Section>

                    {maintenance ? (
                        <Section
                            n={3}
                            icon={User}
                            title="Asisten Bertugas & Hasil"
                        >
                            <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
                                <legend className="sr-only">
                                    Asisten bertugas
                                </legend>
                                {options.assistants.map((a) => (
                                    <label
                                        key={a.id}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        <Checkbox
                                            checked={form.data.staff_ids.includes(
                                                String(a.id),
                                            )}
                                            onCheckedChange={(c) =>
                                                form.setData(
                                                    'staff_ids',
                                                    c
                                                        ? [
                                                              ...form.data
                                                                  .staff_ids,
                                                              String(a.id),
                                                          ]
                                                        : form.data.staff_ids.filter(
                                                              (id) =>
                                                                  id !==
                                                                  String(a.id),
                                                          ),
                                                )
                                            }
                                        />
                                        {a.name}
                                    </label>
                                ))}
                            </fieldset>
                            <div className="grid gap-2">
                                <Label htmlFor="p-result">Catatan Hasil</Label>
                                <Textarea
                                    id="p-result"
                                    rows={3}
                                    maxLength={3000}
                                    value={form.data.result_notes}
                                    onChange={(e) =>
                                        form.setData(
                                            'result_notes',
                                            e.target.value,
                                        )
                                    }
                                    placeholder="Semua PC berfungsi; PC-27 menunggu penggantian PSU."
                                />
                            </div>
                        </Section>
                    ) : (
                        <Section
                            n={event ? 4 : 3}
                            icon={Ticket}
                            title={
                                event
                                    ? 'Kuota Peserta & Pengaturan Tiket (Biaya)'
                                    : 'Kuota Pelamar'
                            }
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="p-quota">
                                        Kuota Maksimum{' '}
                                        {recruitment ? 'Pelamar' : 'Peserta'}
                                    </Label>
                                    <Input
                                        id="p-quota"
                                        type="number"
                                        min={1}
                                        value={form.data.quota}
                                        onChange={(e) =>
                                            form.setData(
                                                'quota',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Kosongkan bila tanpa batas"
                                    />
                                    <InputError message={form.errors.quota} />
                                </div>
                                {event && (
                                    <div
                                        role="radiogroup"
                                        aria-label="Biaya"
                                        className="flex items-end gap-5 pb-2 text-sm"
                                    >
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                checked={!form.data.paid}
                                                onChange={() =>
                                                    form.setData('paid', false)
                                                }
                                                className="accent-primary-700"
                                            />{' '}
                                            Gratis
                                        </label>
                                        <label className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                checked={form.data.paid}
                                                onChange={() =>
                                                    form.setData('paid', true)
                                                }
                                                className="accent-primary-700"
                                            />{' '}
                                            Berbayar
                                        </label>
                                    </div>
                                )}
                            </div>
                            {event && form.data.paid && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="p-fee-in">
                                            Tarif Mahasiswa Aktif (Rp)
                                        </Label>
                                        <Input
                                            id="p-fee-in"
                                            type="number"
                                            min={0}
                                            value={form.data.fee_internal}
                                            onChange={(e) =>
                                                form.setData(
                                                    'fee_internal',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="p-fee-ex">
                                            Tarif Peserta Umum (Rp)
                                        </Label>
                                        <Input
                                            id="p-fee-ex"
                                            type="number"
                                            min={0}
                                            value={form.data.fee_external}
                                            onChange={(e) =>
                                                form.setData(
                                                    'fee_external',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            )}
                            {event && (
                                <fieldset className="grid gap-2">
                                    <legend className="mb-2 text-sm font-medium">
                                        Fasilitas &amp; Layanan Peserta
                                    </legend>
                                    <div className="grid gap-2 sm:grid-cols-3">
                                        {FACILITIES.map((f) => (
                                            <label
                                                key={f}
                                                className="flex items-center gap-2 border p-2.5 text-sm"
                                            >
                                                <Checkbox
                                                    checked={form.data.facilities.includes(
                                                        f,
                                                    )}
                                                    onCheckedChange={(c) =>
                                                        form.setData(
                                                            'facilities',
                                                            c
                                                                ? [
                                                                      ...form
                                                                          .data
                                                                          .facilities,
                                                                      f,
                                                                  ]
                                                                : form.data.facilities.filter(
                                                                      (x) =>
                                                                          x !==
                                                                          f,
                                                                  ),
                                                        )
                                                    }
                                                />
                                                {f}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            )}
                        </Section>
                    )}

                    {!maintenance && (
                        <Section
                            n={event ? 5 : 4}
                            icon={ImagePlus}
                            title="Upload Poster Banner"
                        >
                            <button
                                type="button"
                                onClick={() => posterInput.current?.click()}
                                className="grid justify-items-center gap-1 border-2 border-dashed border-slate-300 px-4 py-8 text-center hover:bg-muted/30 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
                            >
                                <UploadCloud
                                    className="size-8 text-slate-400"
                                    aria-hidden
                                />
                                <span className="text-sm">
                                    {form.data.poster
                                        ? form.data.poster.name
                                        : program?.poster
                                          ? 'Ganti poster'
                                          : 'Pilih file poster'}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                    PNG/JPEG · rasio 16:9 atau 4:5 · maks 5 MB
                                </span>
                            </button>
                            <input
                                ref={posterInput}
                                type="file"
                                accept="image/png,image/jpeg"
                                className="sr-only"
                                aria-label="Poster"
                                onChange={(e) =>
                                    form.setData(
                                        'poster',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                            />
                            <InputError message={form.errors.poster} />
                        </Section>
                    )}

                    <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-wrap items-center justify-end gap-2 bg-gradient-to-r from-primary-800 to-primary-600 px-6 py-4">
                        <Button
                            type="button"
                            variant="outline"
                            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                            onClick={() => setOpen(false)}
                        >
                            Batal
                        </Button>
                        {!program && event ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={form.processing}
                                    onClick={() => send('draft')}
                                >
                                    <BookOpen /> Simpan sebagai Draft
                                </Button>
                                <Button
                                    type="submit"
                                    variant="outline"
                                    disabled={form.processing}
                                >
                                    {form.processing ? <Spinner /> : <Send />}{' '}
                                    Publikasi Sekarang
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="submit"
                                variant="outline"
                                disabled={form.processing}
                            >
                                {form.processing && <Spinner />} Simpan
                            </Button>
                        )}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
