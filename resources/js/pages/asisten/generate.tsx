import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    CheckCircle2,
    ClipboardCheck,
    Download,
    FileArchive,
    FileSpreadsheet,
    FileText,
    Laptop,
    ListFilter,
    Loader2,
    Search,
    ShieldCheck,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import GenerateController from '@/actions/App/Http/Controllers/Asisten/GenerateController';
import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatRelative } from '@/lib/datetime';
import { formatFileSize } from '@/lib/files';
import { cn } from '@/lib/utils';
import type { ExportRow, HonorRow } from '@/types';

type Props = {
    filters: { month: string; scope: 'mine' | 'all' };
    canAllScope: boolean;
    stats: {
        activeDays: number;
        scheduledShifts: number;
        verified: number;
        total: number;
    };
    files: {
        date: string;
        shifts: number;
        courses: string[];
        assistants: string[];
        materials: string[];
    }[];
    exports: ExportRow[];
    honor: { recaps: HonorRow[]; canApprove: boolean };
};

const MONTHS = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
];

const FORMATS = [
    {
        value: 'zip',
        label: 'ZIP Folder',
        icon: FileArchive,
        description: 'Kumpulan file PDF terpisah per hari pengawasan.',
    },
    {
        value: 'pdf',
        label: 'Single PDF',
        icon: FileText,
        description: 'Satu dokumen gabungan seluruh hari pengawasan.',
    },
    {
        value: 'excel',
        label: 'Excel',
        icon: FileSpreadsheet,
        description: 'Tabel data rekapitulasi & estimasi honor asisten.',
    },
] as const;

const rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});
const longDate = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

const EXPORT_STATUS: Record<
    ExportRow['status'],
    { label: string; variant: 'success' | 'warning' | 'destructive' | 'muted' }
> = {
    queued: { label: 'Antre', variant: 'muted' },
    processing: { label: 'Diproses', variant: 'warning' },
    done: { label: 'Selesai', variant: 'success' },
    empty: { label: 'Tidak ada data', variant: 'muted' },
    failed: { label: 'Gagal', variant: 'destructive' },
};

/** US-A04-1: tampilkan progres ekspor yang sedang berjalan. */
function useExportPolling(exports: ExportRow[]) {
    const [rows, setRows] = useState(exports);
    useEffect(() => setRows(exports), [exports]);

    const running = rows
        .filter((e) => e.status === 'queued' || e.status === 'processing')
        .map((e) => e.id);
    const key = running.join(',');

    useEffect(() => {
        if (!key) return;

        const timer = window.setInterval(async () => {
            const updated = await Promise.all(
                key.split(',').map((id) =>
                    fetch(GenerateController.show.url(Number(id)), {
                        headers: { Accept: 'application/json' },
                    }).then((r) => r.json() as Promise<ExportRow>),
                ),
            );
            setRows((current) =>
                current.map(
                    (row) => updated.find((u) => u.id === row.id) ?? row,
                ),
            );
            if (
                updated.every(
                    (u) => u.status !== 'queued' && u.status !== 'processing',
                )
            ) {
                router.reload({ only: ['exports'] });
            }
        }, 2000);

        return () => window.clearInterval(timer);
    }, [key]);

    return rows;
}

/** Asisten › Generate — Figma "Generate Rekap Laporan Bulanan" (US-A04, FR-AGN). */
export default function AsistenGenerate({
    filters,
    canAllScope,
    stats,
    files,
    exports,
    honor,
}: Props) {
    const semester = usePage().props.activeSemester;
    const [year, month] = filters.month.split('-').map(Number);
    const form = useForm({
        month: filters.month,
        format: 'zip' as (typeof FORMATS)[number]['value'],
        scope: filters.scope,
    });
    const [search, setSearch] = useState('');
    const rows = useExportPolling(exports);
    const complete = stats.total
        ? Math.round((stats.verified / stats.total) * 100)
        : 0;
    const shown = useMemo(
        () =>
            files.filter((f) =>
                `${longDate(f.date)} ${f.courses.join(' ')} ${f.assistants.join(' ')}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
            ),
        [files, search],
    );
    const draftHonor = honor.recaps.some((r) => r.status === 'draft');

    const go = (next: Partial<Props['filters']>) =>
        router.get(
            GenerateController.index.url({ query: { ...filters, ...next } }),
            {},
            { preserveScroll: true },
        );
    const setMonth = (y: number, m: number) =>
        go({ month: `${y}-${String(m).padStart(2, '0')}` });

    return (
        <>
            <Head title="Generate Rekap" />
            <div className="flex flex-col gap-6 p-4 pb-28 md:p-6 md:pb-28 lg:p-8 lg:pb-28">
                <div className="space-y-1">
                    <h1 className="text-h1 font-bold text-primary-900">
                        Generate Rekap Laporan Bulanan
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Pusat ekspor rekapitulasi data pengawasan lab bulanan,
                        pratinjau isi dokumen, dan kompilasi unduhan
                        terstruktur.
                    </p>
                </div>

                <section
                    aria-labelledby="criteria"
                    className="grid gap-5 border bg-card p-5 shadow-sm"
                >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center bg-primary-100 text-primary-800">
                                <ListFilter className="size-5" aria-hidden />
                            </span>
                            <div>
                                <h2 id="criteria" className="text-h2 font-bold">
                                    Kriteria Periode &amp; Format Ekspor
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    Hanya laporan berstatus Diverifikasi
                                    Sekretaris yang masuk rekap.
                                </p>
                            </div>
                        </div>
                        {semester && (
                            <span className="bg-primary-100 px-3 py-1 font-mono text-xs text-primary-800">
                                ● Semester {semester.name}
                            </span>
                        )}
                    </div>
                    <div className="grid gap-5 lg:grid-cols-[1fr_1fr_3fr]">
                        <label className="grid content-start gap-2 text-sm font-medium">
                            Pilih Bulan
                            <select
                                value={month}
                                onChange={(e) =>
                                    setMonth(year, Number(e.target.value))
                                }
                                className="h-10 border border-input bg-white px-3 text-sm font-normal"
                            >
                                {MONTHS.map((name, i) => (
                                    <option key={name} value={i + 1}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="grid content-start gap-2 text-sm font-medium">
                            Pilih Tahun
                            <select
                                value={year}
                                onChange={(e) =>
                                    setMonth(Number(e.target.value), month)
                                }
                                className="h-10 border border-input bg-white px-3 text-sm font-normal"
                            >
                                {[year - 1, year, year + 1].map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <fieldset className="grid gap-2">
                            <legend className="mb-2 text-sm font-medium">
                                Format Output Berkas
                            </legend>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {FORMATS.map(
                                    ({
                                        value,
                                        label,
                                        icon: Icon,
                                        description,
                                    }) => (
                                        <label
                                            key={value}
                                            className={cn(
                                                'relative grid cursor-pointer gap-1.5 border p-3 text-xs has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40',
                                                form.data.format === value
                                                    ? 'border-2 border-primary-700 bg-primary-50'
                                                    : 'hover:bg-muted/50',
                                            )}
                                        >
                                            <input
                                                type="radio"
                                                name="format"
                                                value={value}
                                                checked={
                                                    form.data.format === value
                                                }
                                                onChange={() =>
                                                    form.setData(
                                                        'format',
                                                        value,
                                                    )
                                                }
                                                className="absolute top-3 right-3 accent-primary-700"
                                            />
                                            <span className="flex items-center gap-2 font-bold">
                                                <Icon
                                                    className="size-4"
                                                    aria-hidden
                                                />{' '}
                                                {label}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {description}
                                            </span>
                                        </label>
                                    ),
                                )}
                            </div>
                        </fieldset>
                    </div>
                    {canAllScope && (
                        <div
                            role="radiogroup"
                            aria-label="Cakupan"
                            className="flex flex-wrap items-center gap-4 text-sm"
                        >
                            <span className="font-medium">Cakupan:</span>
                            {(
                                [
                                    ['mine', 'Laporan saya'],
                                    ['all', 'Semua asisten'],
                                ] as const
                            ).map(([value, label]) => (
                                <label
                                    key={value}
                                    className="flex items-center gap-2"
                                >
                                    <input
                                        type="radio"
                                        name="scope"
                                        checked={filters.scope === value}
                                        onChange={() => go({ scope: value })}
                                        className="accent-primary-700"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>
                    )}
                </section>

                <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center justify-between border bg-card p-5">
                        <div className="grid gap-1">
                            <span className="text-sm">Hari Laporan Aktif</span>
                            <span className="flex items-baseline gap-2">
                                <strong className="text-display leading-none">
                                    {stats.activeDays}
                                </strong>
                                <span className="text-xs text-primary-700">
                                    Hari Pengawasan
                                </span>
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <CalendarDays
                                    className="size-3.5"
                                    aria-hidden
                                />{' '}
                                {MONTHS[month - 1]} {year}
                            </span>
                        </div>
                        <span className="flex size-14 items-center justify-center bg-primary-100 text-primary-800">
                            <CalendarDays className="size-7" aria-hidden />
                        </span>
                    </div>
                    <div className="flex items-center justify-between border bg-card p-5">
                        <div className="grid gap-1">
                            <span className="text-sm">Sesi Terjadwal</span>
                            <span className="flex items-baseline gap-2">
                                <strong className="text-display leading-none">
                                    {stats.scheduledShifts}
                                </strong>
                                <span className="text-xs text-primary-700">
                                    Total Shift
                                </span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                                {stats.total} laporan dibuat
                            </span>
                        </div>
                        <span className="flex size-14 items-center justify-center bg-primary-100 text-primary-800">
                            <Laptop className="size-7" aria-hidden />
                        </span>
                    </div>
                    <div className="flex items-center justify-between border bg-card p-5">
                        <div className="grid gap-2">
                            <span className="text-sm">Status Kelengkapan</span>
                            <span
                                className={cn(
                                    'w-fit px-3 py-1 text-sm font-bold',
                                    complete === 100
                                        ? 'bg-success-soft text-success'
                                        : 'bg-warning-soft text-warning',
                                )}
                            >
                                {complete}% Terverifikasi
                            </span>
                            <span className="flex items-center gap-1 text-xs">
                                <CheckCircle2
                                    className="size-3.5"
                                    aria-hidden
                                />{' '}
                                {stats.verified}/{stats.total} laporan siap
                                diekspor
                            </span>
                        </div>
                        <span className="flex size-14 items-center justify-center bg-success-soft text-success">
                            <ClipboardCheck className="size-7" aria-hidden />
                        </span>
                    </div>
                </div>

                <section
                    aria-labelledby="files-title"
                    className="border bg-card"
                >
                    <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                        <div>
                            <h2 id="files-title" className="text-h2 font-bold">
                                Daftar Berkas Rekapitulasi
                            </h2>
                            <p className="text-xs text-muted-foreground">
                                Pratinjau berkas harian yang akan dikompresi ke
                                dalam arsip.
                            </p>
                        </div>
                        <div className="relative">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden
                            />
                            <Input
                                type="search"
                                aria-label="Cari berkas"
                                placeholder="Cari nama berkas…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-64 pl-9"
                            />
                        </div>
                    </div>
                    {files.length === 0 ? (
                        <div className="px-5 pb-5">
                            <EmptyState
                                icon={FileText}
                                title="Tidak ada laporan pada periode ini"
                                description="Belum ada laporan terverifikasi di bulan ini."
                            />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[48rem] text-sm">
                                <thead className="bg-primary-50 text-left font-mono text-xs">
                                    <tr>
                                        <th className="px-5 py-3">
                                            Nama File Rekap
                                        </th>
                                        <th className="px-3 py-3">
                                            Detail Mata Kuliah
                                        </th>
                                        <th className="px-3 py-3">
                                            Status Berkas
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {shown.map((f) => (
                                        <tr
                                            key={f.date}
                                            className="border-b align-top last:border-b-0"
                                        >
                                            <td className="px-5 py-3">
                                                <span className="flex items-center gap-3">
                                                    <span className="flex size-9 items-center justify-center bg-primary-100 font-mono text-[10px] font-bold text-primary-800">
                                                        PDF
                                                    </span>
                                                    <span className="grid">
                                                        <span className="font-medium">
                                                            {longDate(f.date)}
                                                            .pdf
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">
                                                            {f.shifts} Shift
                                                            Pengawasan
                                                        </span>
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 text-xs">
                                                <span className="block font-medium">
                                                    {f.courses.join(', ')}
                                                </span>
                                                {f.materials.length > 0 && (
                                                    <span className="block text-muted-foreground">
                                                        Materi:{' '}
                                                        {f.materials.join(', ')}
                                                    </span>
                                                )}
                                                <span className="block text-muted-foreground">
                                                    Asisten:{' '}
                                                    {f.assistants.join(', ')}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <span className="inline-flex items-center gap-1 bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                                                    <CheckCircle2
                                                        className="size-3.5"
                                                        aria-hidden
                                                    />{' '}
                                                    Siap Diekspor
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <div className="grid gap-6 xl:grid-cols-2">
                    <section
                        aria-labelledby="exports-title"
                        className="grid content-start gap-3"
                    >
                        <h2 id="exports-title" className="text-h3 font-bold">
                            Riwayat Ekspor
                        </h2>
                        <p className="-mt-2 text-xs text-muted-foreground">
                            Tautan unduh berlaku 24 jam; file dihapus otomatis
                            setelah 7 hari.
                        </p>
                        {rows.length === 0 ? (
                            <p className="border bg-card p-4 text-sm text-muted-foreground">
                                Belum ada ekspor.
                            </p>
                        ) : (
                            <ul className="grid gap-2">
                                {rows.map((e) => (
                                    <li
                                        key={e.id}
                                        className="grid gap-2 border bg-card px-4 py-3"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-sm font-medium">
                                                {
                                                    MONTHS[
                                                        Number(
                                                            e.month.slice(5),
                                                        ) - 1
                                                    ]
                                                }{' '}
                                                {e.month.slice(0, 4)} ·{' '}
                                                {
                                                    FORMATS.find(
                                                        (f) =>
                                                            f.value === e.type,
                                                    )?.label
                                                }
                                                {e.scope === 'all' &&
                                                    ' · semua asisten'}
                                            </span>
                                            <Badge
                                                variant={
                                                    EXPORT_STATUS[e.status]
                                                        .variant
                                                }
                                            >
                                                {(e.status === 'processing' ||
                                                    e.status === 'queued') && (
                                                    <Loader2
                                                        className="animate-spin"
                                                        aria-hidden
                                                    />
                                                )}
                                                {EXPORT_STATUS[e.status].label}
                                            </Badge>
                                        </div>
                                        {(e.status === 'processing' ||
                                            e.status === 'queued') && (
                                            <div
                                                className="h-1.5 bg-muted"
                                                role="progressbar"
                                                aria-valuenow={e.progress}
                                                aria-valuemin={0}
                                                aria-valuemax={100}
                                                aria-label="Progres ekspor"
                                            >
                                                <div
                                                    className="h-full bg-primary-600 transition-all"
                                                    style={{
                                                        width: `${Math.max(5, e.progress)}%`,
                                                    }}
                                                />
                                            </div>
                                        )}
                                        {e.error && (
                                            <p className="text-xs text-muted-foreground">
                                                {e.error}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                                            <span>
                                                Dibuat{' '}
                                                {formatRelative(e.createdAt)}
                                            </span>
                                            {e.file ? (
                                                <a
                                                    href={e.file.url}
                                                    className="inline-flex items-center gap-1 font-medium text-primary-700 underline"
                                                >
                                                    <Download
                                                        className="size-3.5"
                                                        aria-hidden
                                                    />{' '}
                                                    {e.file.name} (
                                                    {formatFileSize(
                                                        e.file.size,
                                                    )}
                                                    )
                                                </a>
                                            ) : (
                                                e.status === 'done' && (
                                                    <span>
                                                        Tautan kedaluwarsa
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section
                        aria-labelledby="honor-title"
                        className="grid content-start gap-3"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2 id="honor-title" className="text-h3 font-bold">
                                Rekap Honor {MONTHS[month - 1]} {year}
                            </h2>
                            {honor.canApprove && draftHonor && (
                                <Button
                                    size="sm"
                                    onClick={() =>
                                        router.post(
                                            GenerateController.approveHonor.url(),
                                            { month: filters.month },
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <ShieldCheck /> Setujui Rekap (Bendahara)
                                </Button>
                            )}
                        </div>
                        <p className="-mt-2 text-xs text-muted-foreground">
                            Total jam dari laporan terverifikasi × tarif per
                            jam. Berstatus Draft sampai disetujui Bendahara.
                        </p>
                        {honor.recaps.length === 0 ? (
                            <p className="border bg-card p-4 text-sm text-muted-foreground">
                                Belum ada jam terverifikasi pada bulan ini.
                            </p>
                        ) : (
                            <div className="overflow-x-auto border bg-card">
                                <table className="w-full min-w-[36rem] text-sm">
                                    <thead className="bg-primary-50 text-left font-mono text-xs">
                                        <tr>
                                            <th className="px-4 py-2.5">
                                                Asisten
                                            </th>
                                            <th className="px-3 py-2.5 text-right">
                                                Shift
                                            </th>
                                            <th className="px-3 py-2.5 text-right">
                                                Jam
                                            </th>
                                            <th className="px-3 py-2.5 text-right">
                                                Estimasi Honor
                                            </th>
                                            <th className="px-3 py-2.5">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {honor.recaps.map((r) => (
                                            <tr key={r.id} className="border-t">
                                                <td className="px-4 py-2.5">
                                                    {r.name}
                                                    <span className="block font-mono text-[11px] text-muted-foreground">
                                                        {r.nim}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-mono">
                                                    {r.shifts}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-mono">
                                                    {r.hours.toLocaleString(
                                                        'id-ID',
                                                    )}
                                                </td>
                                                <td className="px-3 py-2.5 text-right font-mono">
                                                    {rupiah.format(r.amount)}
                                                    <span className="block text-[11px] text-muted-foreground">
                                                        @{' '}
                                                        {rupiah.format(r.rate)}
                                                        /jam
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <Badge
                                                        variant={
                                                            r.status === 'final'
                                                                ? 'success'
                                                                : 'warning'
                                                        }
                                                    >
                                                        {r.status === 'final'
                                                            ? 'Final'
                                                            : 'Draft'}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Figma: bar aksi menempel di bawah. */}
            <div className="fixed right-4 bottom-4 left-4 z-20 flex flex-wrap items-center justify-between gap-3 border bg-card p-3 shadow-lg md:right-8 md:left-[calc(var(--sidebar-width,16rem)+1.5rem)]">
                <span className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center bg-primary-100 text-primary-800">
                        <FileArchive className="size-5" aria-hidden />
                    </span>
                    <span className="grid text-sm">
                        <strong>{files.length} Berkas Harian</strong>
                        <span className="text-xs text-muted-foreground">
                            Format{' '}
                            {
                                FORMATS.find(
                                    (f) => f.value === form.data.format,
                                )?.label
                            }{' '}
                            · Rekapitulasi {MONTHS[month - 1]} {year}
                        </span>
                    </span>
                </span>
                <Button
                    onClick={() =>
                        form.post(GenerateController.store.url(), {
                            preserveScroll: true,
                        })
                    }
                    disabled={form.processing || files.length === 0}
                    title={
                        files.length === 0
                            ? 'Tidak ada laporan pada periode ini'
                            : undefined
                    }
                >
                    {form.processing ? <Spinner /> : <Download />} Generate
                    &amp; Unduh
                </Button>
            </div>
        </>
    );
}
