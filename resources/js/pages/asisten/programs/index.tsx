import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    Archive,
    CalendarDays,
    CheckCircle2,
    ClipboardList,
    Link2,
    Lock,
    MapPin,
    Pencil,
    PlusCircle,
    Trash2,
    UserCheck,
    Users,
    Wrench,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import ProgramController from '@/actions/App/Http/Controllers/Asisten/ProgramController';
import { EmptyState } from '@/components/empty-state';
import { ProgramFormDialog } from '@/components/programs/program-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PROGRAM_STATUS } from '@/types';
import type { ProgramCard, ProgramOptions, ProgramTypeInfo } from '@/types';

type Props = {
    type: ProgramTypeInfo;
    programs: ProgramCard[];
    stats: {
        total: number;
        open: number;
        registrants: number;
        capacity: number;
        finished: number;
    };
    options: ProgramOptions;
};

const rupiah = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
const when = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          })
        : 'Belum dijadwalkan';
const clock = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
          })
        : '';
const initials = (name: string) =>
    name
        .replace(/^((Dr|Ir|Prof|Drs)\.\s*)+/, '')
        .split(' ')
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase();
name.replace(/^(Dr\.|Ir\.|Prof\.)\s*/g, '')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

function ProgramTile({ p, type }: { p: ProgramCard; type: ProgramTypeInfo }) {
    const pct = p.quota
        ? Math.min(100, Math.round((p.registered / p.quota) * 100))
        : null;
    const full = pct !== null && pct >= 100;
    const [copied, setCopied] = useState(false);
    const link = `${window.location.origin}/praktikan/programs/${p.id}`;

    return (
        <li className="grid content-start gap-4 border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <Badge variant={PROGRAM_STATUS[p.status].variant}>
                    ● {PROGRAM_STATUS[p.status].label}
                </Badge>
                {type.value !== 'recruitment' && (
                    <Badge variant="outline">
                        {p.mode === 'online' ? 'Online Zoom' : 'Offline di Lab'}
                    </Badge>
                )}
                {full && <Badge variant="destructive">Kuota Penuh</Badge>}
                {(p.feeInternal ?? 0) > 0 ? (
                    <span className="ml-auto bg-muted px-2 py-0.5">
                        {rupiah(p.feeInternal!)}{' '}
                        {p.feeExternal ? `/ ${rupiah(p.feeExternal)}` : ''}
                    </span>
                ) : (
                    type.value !== 'recruitment' && (
                        <span className="ml-auto bg-success-soft px-2 py-0.5 text-success">
                            Gratis
                        </span>
                    )
                )}
            </div>
            <h3 className="text-h3 leading-tight font-bold">{p.title}</h3>
            {p.speakerName && (
                <div className="flex items-center gap-3 border-t pt-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-800 text-sm font-bold text-white">
                        {initials(p.speakerName)}
                    </span>
                    <span className="grid">
                        <span className="font-bold">{p.speakerName}</span>
                        <span className="text-xs text-muted-foreground">
                            {p.speakerAffiliation}
                        </span>
                    </span>
                </div>
            )}
            <div className="grid gap-3 bg-primary-50 p-3 text-xs sm:grid-cols-2">
                <span className="flex gap-2">
                    <CalendarDays
                        className="size-4 shrink-0 text-primary-700"
                        aria-hidden
                    />
                    <span>
                        <span className="block text-muted-foreground">
                            {type.value === 'recruitment'
                                ? 'Penutupan Pendaftaran'
                                : 'Jadwal Pelaksanaan'}
                        </span>
                        <strong>
                            {when(
                                type.value === 'recruitment'
                                    ? p.closesAt
                                    : p.startsAt,
                            )}
                        </strong>
                        {type.value !== 'recruitment' && p.startsAt && (
                            <span className="block">
                                {clock(p.startsAt)}
                                {p.endsAt && `–${clock(p.endsAt)}`} WIB
                            </span>
                        )}
                    </span>
                </span>
                {type.value !== 'recruitment' && (
                    <span className="flex gap-2">
                        <MapPin
                            className="size-4 shrink-0 text-primary-700"
                            aria-hidden
                        />
                        <span>
                            <span className="block text-muted-foreground">
                                Lokasi / Platform
                            </span>
                            <strong className="break-all">
                                {p.location ?? '—'}
                            </strong>
                            <span className="block text-success">
                                {p.mode === 'online' ? 'Online' : 'Offline'}
                            </span>
                        </span>
                    </span>
                )}
            </div>
            <div className="grid gap-1.5">
                <div className="flex justify-between text-xs">
                    <span>
                        Kuota{' '}
                        {type.value === 'recruitment' ? 'Pelamar' : 'Peserta'}
                    </span>
                    <span
                        className={cn(
                            'font-bold',
                            full ? 'text-danger' : 'text-primary-800',
                        )}
                    >
                        {p.registered}
                        {p.quota ? ` / ${p.quota}` : ''}{' '}
                        {type.value === 'recruitment' ? 'Pelamar' : 'Peserta'}{' '}
                        {pct !== null && `(${pct}%)`}
                    </span>
                </div>
                <div className="h-1.5 bg-primary-100">
                    <div
                        className={cn(
                            'h-full',
                            full ? 'bg-danger' : 'bg-primary-700',
                        )}
                        style={{
                            width: `${pct ?? Math.min(100, p.registered * 2)}%`,
                        }}
                    />
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                {p.accepting ? (
                    <button
                        type="button"
                        onClick={() => {
                            void navigator.clipboard?.writeText(link);
                            setCopied(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
                    >
                        <Link2 className="size-3.5" aria-hidden />{' '}
                        {copied ? 'Tautan disalin' : 'Salin Link Registrasi'}
                    </button>
                ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock className="size-3.5" aria-hidden />{' '}
                        {p.status === 'draft'
                            ? 'Belum dipublikasikan'
                            : 'Akses registrasi dikunci'}
                    </span>
                )}
                <Button size="sm" asChild>
                    <Link href={ProgramController.show.url(p.id)}>
                        <Users />{' '}
                        {type.value === 'recruitment'
                            ? 'Command Center'
                            : 'Kelola Peserta'}
                    </Link>
                </Button>
            </div>
        </li>
    );
}

function MaintenanceLog({
    programs,
    type,
    options,
}: {
    programs: ProgramCard[];
    type: ProgramTypeInfo;
    options: ProgramOptions;
}) {
    if (programs.length === 0) {
        return (
            <EmptyState
                icon={Wrench}
                title="Belum ada log maintenance"
                description="Catat jadwal perawatan PC dan perangkat lab."
            />
        );
    }

    return (
        <div className="overflow-x-auto border bg-card">
            <table className="w-full min-w-[56rem] text-sm">
                <thead className="bg-primary-50 text-left font-mono text-xs">
                    <tr>
                        <th className="px-4 py-3">Jadwal</th>
                        <th className="px-3 py-3">Kegiatan</th>
                        <th className="px-3 py-3">PC / Perangkat</th>
                        <th className="px-3 py-3">Asisten Bertugas</th>
                        <th className="px-3 py-3">Catatan Hasil</th>
                        <th className="px-3 py-3">
                            <span className="sr-only">Aksi</span>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {programs.map((p) => (
                        <tr key={p.id} className="border-t align-top">
                            <td className="px-4 py-3 text-xs whitespace-nowrap">
                                <strong className="block">
                                    {when(p.startsAt)}
                                </strong>
                                {clock(p.startsAt)}
                                {p.endsAt && `–${clock(p.endsAt)}`} ·{' '}
                                {options.rooms.find((r) => r.id === p.roomId)
                                    ?.name ?? '—'}
                            </td>
                            <td className="px-3 py-3 font-medium">{p.title}</td>
                            <td className="max-w-64 px-3 py-3 text-xs whitespace-pre-line">
                                {p.description}
                            </td>
                            <td className="px-3 py-3 text-xs">
                                {p.staff?.join(', ') || '—'}
                            </td>
                            <td className="max-w-64 px-3 py-3 text-xs whitespace-pre-line">
                                {p.resultNotes ? (
                                    <span className="inline-flex gap-1">
                                        <CheckCircle2
                                            className="mt-0.5 size-3.5 shrink-0 text-success"
                                            aria-hidden
                                        />{' '}
                                        {p.resultNotes}
                                    </span>
                                ) : (
                                    <Badge variant="warning">
                                        Belum ada hasil
                                    </Badge>
                                )}
                            </td>
                            <td className="px-3 py-3">
                                <div className="flex gap-1">
                                    <ProgramFormDialog
                                        type={type}
                                        program={p}
                                        options={options}
                                        trigger={
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                aria-label={`Ubah ${p.title}`}
                                            >
                                                <Pencil />
                                            </Button>
                                        }
                                    />
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        aria-label={`Hapus ${p.title}`}
                                        onClick={() =>
                                            confirm(
                                                `Hapus log "${p.title}"?`,
                                            ) &&
                                            router.delete(
                                                ProgramController.destroy.url(
                                                    p.id,
                                                ),
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        <Trash2 />
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/** Asisten › Program › {jenis} — Figma "Workshop Management" (FR-APR). */
export default function ProgramsIndex({
    type,
    programs,
    stats,
    options,
}: Props) {
    const semester = usePage().props.activeSemester;
    const [tab, setTab] = useState<'all' | 'open' | 'closed'>('all');
    const shown = useMemo(
        () =>
            programs.filter(
                (p) =>
                    tab === 'all' ||
                    (tab === 'open'
                        ? p.status === 'open'
                        : p.status === 'closed' || p.status === 'finished'),
            ),
        [programs, tab],
    );
    const maintenance = type.value === 'maintenance';
    const noun = type.value === 'recruitment' ? 'Pelamar' : 'Peserta';

    return (
        <>
            <Head title={`${type.label} Management`} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-h1 font-bold text-primary-900">
                        {maintenance
                            ? 'Maintenance Log'
                            : `${type.label} Management`}
                    </h1>
                    <ProgramFormDialog
                        type={type}
                        options={options}
                        trigger={
                            <Button>
                                <PlusCircle />{' '}
                                {maintenance
                                    ? 'Catat Maintenance'
                                    : `Buat ${type.label} Baru`}
                            </Button>
                        }
                    />
                </div>

                <section className="flex flex-wrap items-start justify-between gap-3 border bg-card p-5 shadow-sm">
                    <div className="space-y-1">
                        <p className="flex items-center gap-2 text-[11px] font-bold tracking-wide text-primary-700 uppercase">
                            <span
                                aria-hidden
                                className="size-1.5 rounded-full bg-primary-700"
                            />{' '}
                            Laboratorium Information Retrieval
                        </p>
                        <h2 className="text-h2 font-bold">{type.label}</h2>
                        <p className="max-w-2xl text-sm text-muted-foreground">
                            {maintenance
                                ? 'Log perawatan PC dan perangkat lab: jadwal, perangkat yang ditangani, asisten bertugas, dan catatan hasil (internal, tanpa pendaftaran).'
                                : type.value === 'recruitment'
                                  ? 'Command center rekrutmen asisten: persiapan timeline, persyaratan, form pendaftaran, pipeline pelamar, dan arsip tahun sebelumnya.'
                                  : `Pusat pengelolaan ${type.label.toLowerCase()}, pendaftaran praktikan/peserta, presensi, dan arsip program laboratorium.`}
                        </p>
                    </div>
                    {semester && (
                        <span className="bg-primary-100 px-3 py-1 font-mono text-xs text-primary-800">
                            ● Semester {semester.name}
                        </span>
                    )}
                </section>

                {!maintenance && (
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <div className="grid gap-2 border bg-card p-5">
                            <span className="text-sm">
                                Total Program {type.label}
                            </span>
                            <strong className="text-h1">
                                {stats.total} Program
                            </strong>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarDays
                                    className="size-3.5"
                                    aria-hidden
                                />{' '}
                                {semester ? `Semester ${semester.name}` : '—'}
                            </span>
                        </div>
                        <div className="grid gap-2 border bg-card p-5">
                            <span className="text-sm">Pendaftaran Dibuka</span>
                            <strong className="text-h1 text-success">
                                {stats.open} Program
                            </strong>
                            <span className="flex items-center gap-1 text-xs text-success">
                                <UserCheck className="size-3.5" aria-hidden />{' '}
                                Aktif menerima registrasi
                            </span>
                        </div>
                        <div className="grid gap-2 border bg-card p-5">
                            <span className="text-sm">
                                Total {noun} Terdaftar
                            </span>
                            <strong className="text-h1">
                                {stats.registrants}
                            </strong>
                            {stats.capacity > 0 && (
                                <span className="flex items-center gap-2 text-xs">
                                    <span className="h-1.5 flex-1 bg-primary-100">
                                        <span
                                            className="block h-full bg-primary-700"
                                            style={{
                                                width: `${Math.min(100, (stats.registrants / stats.capacity) * 100)}%`,
                                            }}
                                        />
                                    </span>
                                    {Math.round(
                                        (stats.registrants / stats.capacity) *
                                            100,
                                    )}
                                    % Kapasitas
                                </span>
                            )}
                        </div>
                        <div className="grid gap-2 border bg-card p-5">
                            <span className="text-sm">Selesai / Arsip</span>
                            <strong className="text-h1">
                                {stats.finished} Arsip
                            </strong>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Archive className="size-3.5" aria-hidden />{' '}
                                Program terdahulu
                            </span>
                        </div>
                    </div>
                )}

                {maintenance ? (
                    <MaintenanceLog
                        programs={programs}
                        type={type}
                        options={options}
                    />
                ) : (
                    <>
                        <div
                            role="tablist"
                            className="flex flex-wrap gap-2 border bg-card p-2"
                        >
                            {(
                                [
                                    [
                                        'all',
                                        `Semua ${type.label}`,
                                        programs.length,
                                    ],
                                    [
                                        'open',
                                        'Pendaftaran Dibuka',
                                        programs.filter(
                                            (p) => p.status === 'open',
                                        ).length,
                                    ],
                                    [
                                        'closed',
                                        'Pendaftaran Ditutup',
                                        programs.filter(
                                            (p) =>
                                                p.status === 'closed' ||
                                                p.status === 'finished',
                                        ).length,
                                    ],
                                ] as const
                            ).map(([value, label, count]) => (
                                <button
                                    key={value}
                                    role="tab"
                                    aria-selected={tab === value}
                                    onClick={() => setTab(value)}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2 text-sm font-medium',
                                        tab === value
                                            ? 'bg-primary-700 text-white'
                                            : 'hover:bg-primary-50',
                                    )}
                                >
                                    {label}
                                    <span
                                        className={cn(
                                            'rounded-full px-2 text-[11px]',
                                            tab === value
                                                ? 'bg-white/20'
                                                : 'bg-primary-100 text-primary-800',
                                        )}
                                    >
                                        {count}
                                    </span>
                                </button>
                            ))}
                        </div>
                        {shown.length === 0 ? (
                            <EmptyState
                                icon={ClipboardList}
                                title={`Belum ada ${type.label.toLowerCase()}`}
                                description={`Buat ${type.label.toLowerCase()} baru lalu publikasikan agar praktikan dapat mendaftar.`}
                            />
                        ) : (
                            <ul className="grid gap-5 lg:grid-cols-2">
                                {shown.map((p) => (
                                    <ProgramTile key={p.id} p={p} type={type} />
                                ))}
                            </ul>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
