import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    AtSign,
    CheckCircle2,
    GraduationCap,
    Hash,
    IdCard,
    LayoutGrid,
    Lock,
    MonitorSmartphone,
    User,
} from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { useEffect } from 'react';
import SeatController from '@/actions/App/Http/Controllers/Praktikan/SeatController';
import InputError from '@/components/input-error';
import { displayLabel, SeatLegend, SeatMap } from '@/components/seats/seat-map';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { formatSchedule } from '@/lib/days';
import { edit as editProfile } from '@/routes/profile';
import type { SeatClassSummary, SeatMapPayload } from '@/types';

type Props = {
    class: SeatClassSummary;
    options: { id: number; label: string }[];
    profile: {
        name: string;
        nim: string | null;
        major: string | null;
        email: string;
    };
    map: SeatMapPayload | null;
    capacity: { total: number; available: number };
};

function ReadOnlyField({
    id,
    label,
    value,
    icon: Icon,
    mono,
}: {
    id: string;
    label: string;
    value: ReactNode;
    icon: typeof User;
    mono?: boolean;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>
                {label}
                <span className="text-destructive">*</span>
            </Label>
            <div
                id={id}
                role="textbox"
                aria-readonly="true"
                className="flex h-11 items-center gap-2 border border-input bg-muted/60 px-3 text-sm text-foreground"
            >
                <Icon
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                />
                <span className={mono ? 'font-mono' : undefined}>
                    {value || (
                        <span className="text-muted-foreground">
                            Belum diisi
                        </span>
                    )}
                </span>
            </div>
        </div>
    );
}

/** Figma "Formulir Kontrak Tempat Duduk" (US-P04-2, FR-PST-03). */
export default function SeatContractForm({
    class: cls,
    options,
    profile,
    map,
    capacity,
}: Props) {
    const form = useForm<{ seat_id: number | null; agreement: boolean }>({
        seat_id: null,
        agreement: false,
    });
    const profileIncomplete = !profile.nim || !profile.major;
    const blocked = !cls.contractOpen || profileIncomplete || !map;
    const selectedCell = map?.layout.cells.find(
        (cell) => cell.id === form.data.seat_id,
    );

    // US-P04-3: kursi pilihan diambil orang lain → denah sudah diperbarui, kosongkan pilihan.
    useEffect(() => {
        if (
            form.data.seat_id &&
            map?.occupants.some((o) => o.seatId === form.data.seat_id)
        ) {
            form.setData('seat_id', null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [map]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(SeatController.store.url(cls.id), { preserveScroll: true });
    };

    return (
        <>
            <Head title="Formulir Kontrak Tempat Duduk" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <section className="flex flex-col gap-4 border bg-card p-5 md:flex-row md:items-start md:justify-between">
                    <div className="max-w-2xl space-y-2">
                        <span
                            className={
                                cls.contractOpen
                                    ? 'bg-primary-100 px-2.5 py-1 font-mono text-xs text-primary-800'
                                    : 'bg-warning-soft px-2.5 py-1 font-mono text-xs text-warning'
                            }
                        >
                            {cls.contractOpen
                                ? 'Tahap Kontrak Terbuka'
                                : 'Periode Kontrak Ditutup'}
                        </span>
                        <h1 className="mt-2 text-h1 font-bold text-primary-900">
                            Formulir Kontrak Tempat Duduk
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Lengkapi identitas akademik dan pilih nomor
                            workstation komputer di laboratorium untuk dikunci
                            selama 1 semester. Workstation yang sudah
                            dikonfirmasi tidak dapat diganti tanpa persetujuan
                            Koordinator Laboratorium.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 self-start bg-primary-100 px-4 py-3">
                        <span className="flex size-10 items-center justify-center bg-primary-800 text-white">
                            <MonitorSmartphone className="size-5" aria-hidden />
                        </span>
                        <span className="grid">
                            <span className="text-xs text-primary-800">
                                Kapasitas Kursi
                            </span>
                            <span className="text-h3 font-bold text-primary-900">
                                {capacity.available} Tersisa{' '}
                                <span className="text-xs font-normal">
                                    / {capacity.total} PC
                                </span>
                            </span>
                        </span>
                    </div>
                </section>

                {profileIncomplete && (
                    <p
                        role="alert"
                        className="flex flex-wrap items-center gap-2 border border-warning/40 bg-warning-soft p-4 text-sm text-warning"
                    >
                        <AlertTriangle className="size-4" aria-hidden /> NIM dan
                        Program Studi wajib terisi sebelum mengontrak kursi.
                        <Link
                            href={editProfile()}
                            className="font-bold underline"
                        >
                            Lengkapi profil
                        </Link>
                    </p>
                )}
                {!cls.contractOpen && (
                    <p
                        role="alert"
                        className="flex items-center gap-2 border border-warning/40 bg-warning-soft p-4 text-sm text-warning"
                    >
                        <Lock className="size-4" aria-hidden /> Periode kontrak
                        kursi untuk kelas ini belum dibuka asisten.
                    </p>
                )}

                <form
                    onSubmit={submit}
                    className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"
                >
                    <section
                        aria-labelledby="identity-title"
                        className="flex flex-col gap-5 border bg-card p-5"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <h2
                                id="identity-title"
                                className="flex items-center gap-2 text-h3 font-bold"
                            >
                                <IdCard
                                    className="size-6 text-primary-700"
                                    aria-hidden
                                />{' '}
                                Data Identitas Praktikan
                            </h2>
                            <span className="text-xs text-muted-foreground">
                                Otomatis dari profil
                            </span>
                        </div>
                        <ReadOnlyField
                            id="f-name"
                            label="Nama Lengkap Mahasiswa"
                            value={profile.name}
                            icon={User}
                        />
                        <div className="grid gap-5 sm:grid-cols-2">
                            <ReadOnlyField
                                id="f-nim"
                                label="Nomor Induk Mahasiswa"
                                value={profile.nim}
                                icon={Hash}
                                mono
                            />
                            <ReadOnlyField
                                id="f-major"
                                label="Program Studi"
                                value={profile.major}
                                icon={GraduationCap}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="f-class">
                                Mata Kuliah & Kelas Praktikum
                                <span className="text-destructive">*</span>
                            </Label>
                            <select
                                id="f-class"
                                value={cls.id}
                                onChange={(event) =>
                                    router.get(
                                        SeatController.create.url(
                                            Number(event.target.value),
                                        ),
                                    )
                                }
                                className="h-11 border border-input bg-white px-3 text-sm focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
                            >
                                {options.map((option) => (
                                    <option key={option.id} value={option.id}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-muted-foreground">
                                {formatSchedule(
                                    cls.dayOfWeek,
                                    cls.startTime,
                                    cls.endTime,
                                )}{' '}
                                WIB · {cls.room ?? '—'}
                            </p>
                        </div>
                        <ReadOnlyField
                            id="f-email"
                            label="Email Institusi"
                            value={profile.email}
                            icon={AtSign}
                        />

                        <div className="mt-auto grid gap-4 pt-2">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="f-agree"
                                    checked={form.data.agreement}
                                    onCheckedChange={(value) =>
                                        form.setData(
                                            'agreement',
                                            value === true,
                                        )
                                    }
                                    disabled={blocked}
                                    className="mt-0.5"
                                />
                                <Label
                                    htmlFor="f-agree"
                                    className="block text-sm leading-relaxed font-normal"
                                >
                                    Saya menyatakan kebenaran data di atas,
                                    bersedia mematuhi Tata Tertib Laboratorium
                                    IR, dan menyetujui{' '}
                                    <strong>
                                        bahwa nomor workstation PC yang saya
                                        pilih terkunci selama 1 semester
                                    </strong>{' '}
                                    dan tidak dapat ditukar tanpa izin tertulis
                                    dari Koordinator Lab.
                                </Label>
                            </div>
                            <InputError message={form.errors.agreement} />
                            <div className="grid grid-cols-[1fr_2fr] gap-3">
                                <Button variant="outline" asChild>
                                    <Link href={SeatController.index.url()}>
                                        Batal
                                    </Link>
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={
                                        blocked ||
                                        form.processing ||
                                        !form.data.seat_id ||
                                        !form.data.agreement
                                    }
                                >
                                    {form.processing ? (
                                        <Spinner />
                                    ) : (
                                        <CheckCircle2 />
                                    )}{' '}
                                    Kunci & Simpan Kontrak Kursi
                                </Button>
                            </div>
                        </div>
                    </section>

                    <div className="grid content-start gap-4">
                        <section
                            aria-labelledby="picker-title"
                            className="grid gap-4 border bg-card p-5"
                        >
                            <div>
                                <h2
                                    id="picker-title"
                                    className="flex items-center gap-2 text-h3 font-bold"
                                >
                                    <LayoutGrid
                                        className="size-6 text-primary-700"
                                        aria-hidden
                                    />{' '}
                                    Pilih Workstation / Tempat Duduk
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Klik salah satu kotak workstation yang
                                    tersedia. Arahkan ke kursi abu-abu untuk
                                    melihat pemiliknya.
                                </p>
                            </div>
                            <div className="border-y py-2">
                                <SeatLegend
                                    items={[
                                        {
                                            label: 'Tersedia',
                                            className:
                                                'border border-primary-500 bg-primary-50',
                                        },
                                        {
                                            label: 'Pilihan Anda',
                                            className: 'bg-primary-800',
                                        },
                                        {
                                            label: 'Sudah Terisi',
                                            className: 'bg-slate-300',
                                        },
                                    ]}
                                />
                            </div>
                            {map ? (
                                <SeatMap
                                    variant="compact"
                                    layout={map.layout}
                                    occupants={map.occupants}
                                    selectedId={form.data.seat_id}
                                    isSelectable={(cell, occupant) =>
                                        !blocked &&
                                        cell.type === 'seat' &&
                                        !occupant
                                    }
                                    onSelect={(cell) => {
                                        form.setData('seat_id', cell.id);
                                        form.clearErrors('seat_id');
                                    }}
                                />
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    Kelas ini belum memiliki ruang/denah.
                                    Hubungi asisten.
                                </p>
                            )}
                            <InputError message={form.errors.seat_id} />
                        </section>

                        <section
                            aria-live="polite"
                            className="relative flex items-center gap-4 border-2 border-primary-800 bg-card p-5"
                        >
                            {selectedCell && (
                                <span className="absolute top-0 right-0 inline-flex items-center gap-1 bg-primary-800 px-2 py-1 text-[11px] text-white">
                                    <Lock className="size-3" aria-hidden /> Siap
                                    Dikontrak
                                </span>
                            )}
                            <span className="flex h-14 min-w-20 items-center justify-center bg-primary-800 px-3 font-mono text-lg font-bold text-white">
                                {selectedCell
                                    ? displayLabel(selectedCell.label)
                                    : '—'}
                            </span>
                            <span className="grid">
                                <span className="text-xs font-bold tracking-wide text-primary-700 uppercase">
                                    Workstation Terpilih
                                </span>
                                <span className="text-h3 font-bold text-primary-900">
                                    {selectedCell
                                        ? 'Workstation / Tempat Duduk'
                                        : 'Belum memilih kursi'}
                                </span>
                            </span>
                        </section>
                    </div>
                </form>
            </div>
        </>
    );
}
