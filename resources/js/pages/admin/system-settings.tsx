import { Form, Head } from '@inertiajs/react';
import { Clock, FileText, HardDrive, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import SystemSettingController from '@/actions/App/Http/Controllers/Admin/SystemSettingController';
import InputError from '@/components/input-error';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Settings = {
    idle_minutes: number;
    limit_pdf_mb: number;
    limit_zip_mb: number;
    limit_image_mb: number;
    pdf_header_title: string;
    pdf_header_subtitle: string;
};

type Rate = {
    id: number;
    rate: number;
    effectiveFrom: string;
    setBy: string | null;
    createdAt: string;
};

const rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

function Section({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: typeof Clock;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="grid gap-4 border bg-card p-5 md:grid-cols-[16rem_1fr]">
            <div className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center bg-primary-100 text-primary-800">
                    <Icon className="size-4" aria-hidden />
                </span>
                <div>
                    <h2 className="font-bold">{title}</h2>
                    <p className="text-xs text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
            <div className="grid gap-4">{children}</div>
        </section>
    );
}

function NumberField({
    name,
    label,
    suffix,
    value,
    min,
    max,
    error,
}: {
    name: keyof Settings;
    label: string;
    suffix: string;
    value: number;
    min: number;
    max: number;
    error?: string;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={name}>{label}</Label>
            <div className="flex items-center gap-2">
                <Input
                    id={name}
                    name={name}
                    type="number"
                    min={min}
                    max={max}
                    required
                    defaultValue={value}
                    className="w-28"
                />
                <span className="text-sm text-muted-foreground">{suffix}</span>
            </div>
            <InputError message={error} />
        </div>
    );
}

/** Admin › Pengaturan Sistem (FR-ADM-10). */
export default function SystemSettings({
    settings,
    currentRate,
    rates,
}: {
    settings: Settings;
    currentRate: number;
    rates: Rate[];
}) {
    return (
        <>
            <Head title="Pengaturan Sistem" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Pengaturan Sistem"
                    description="Durasi sesi idle, batas ukuran unggahan, kop PDF berita acara, dan tarif honor asisten."
                />

                <Form
                    {...SystemSettingController.update.form()}
                    options={{ preserveScroll: true }}
                    className="grid gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <Section
                                icon={Clock}
                                title="Sesi"
                                description="Pengguna keluar otomatis setelah tidak aktif (kecuali memilih Ingat Saya)."
                            >
                                <NumberField
                                    name="idle_minutes"
                                    label="Durasi idle"
                                    suffix="menit"
                                    value={settings.idle_minutes}
                                    min={5}
                                    max={240}
                                    error={errors.idle_minutes}
                                />
                            </Section>
                            <Section
                                icon={HardDrive}
                                title="Batas Ukuran File"
                                description="Berlaku untuk unggahan baru (NFR-F02)."
                            >
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <NumberField
                                        name="limit_pdf_mb"
                                        label="PDF"
                                        suffix="MB"
                                        value={settings.limit_pdf_mb}
                                        min={1}
                                        max={50}
                                        error={errors.limit_pdf_mb}
                                    />
                                    <NumberField
                                        name="limit_zip_mb"
                                        label="ZIP"
                                        suffix="MB"
                                        value={settings.limit_zip_mb}
                                        min={1}
                                        max={100}
                                        error={errors.limit_zip_mb}
                                    />
                                    <NumberField
                                        name="limit_image_mb"
                                        label="Gambar"
                                        suffix="MB"
                                        value={settings.limit_image_mb}
                                        min={1}
                                        max={20}
                                        error={errors.limit_image_mb}
                                    />
                                </div>
                            </Section>
                            <Section
                                icon={FileText}
                                title="Kop PDF Berita Acara"
                                description="Tampil di setiap halaman rekap laporan mengawas."
                            >
                                <div className="grid gap-2">
                                    <Label htmlFor="pdf_header_title">
                                        Judul
                                    </Label>
                                    <Input
                                        id="pdf_header_title"
                                        name="pdf_header_title"
                                        required
                                        maxLength={100}
                                        defaultValue={settings.pdf_header_title}
                                    />
                                    <InputError
                                        message={errors.pdf_header_title}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="pdf_header_subtitle">
                                        Subjudul
                                    </Label>
                                    <Input
                                        id="pdf_header_subtitle"
                                        name="pdf_header_subtitle"
                                        required
                                        maxLength={150}
                                        defaultValue={
                                            settings.pdf_header_subtitle
                                        }
                                    />
                                    <InputError
                                        message={errors.pdf_header_subtitle}
                                    />
                                </div>
                            </Section>
                            <div className="flex justify-end">
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />} Simpan
                                    Pengaturan
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <Section
                    icon={Wallet}
                    title="Tarif Honor Asisten"
                    description={`Berlaku saat ini: ${rupiah.format(currentRate)}/jam. Perubahan tercatat sebagai riwayat.`}
                >
                    <Form
                        {...SystemSettingController.storeRate.form()}
                        options={{ preserveScroll: true }}
                        resetOnSuccess
                        className="flex flex-wrap items-end gap-3"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="rate_per_hour">
                                        Tarif per jam (Rp)
                                    </Label>
                                    <Input
                                        id="rate_per_hour"
                                        name="rate_per_hour"
                                        type="number"
                                        min={1000}
                                        step={500}
                                        required
                                        className="w-40"
                                    />
                                    <InputError
                                        message={errors.rate_per_hour}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="effective_from">
                                        Berlaku mulai
                                    </Label>
                                    <Input
                                        id="effective_from"
                                        name="effective_from"
                                        type="date"
                                        required
                                        defaultValue={new Date().toLocaleDateString(
                                            'sv-SE',
                                        )}
                                    />
                                    <InputError
                                        message={errors.effective_from}
                                    />
                                </div>
                                <Button type="submit" disabled={processing}>
                                    {processing && <Spinner />} Tetapkan Tarif
                                </Button>
                            </>
                        )}
                    </Form>
                    {rates.length > 0 && (
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-muted-foreground">
                                <tr>
                                    <th className="py-2 font-medium">
                                        Berlaku mulai
                                    </th>
                                    <th className="py-2 text-right font-medium">
                                        Tarif / jam
                                    </th>
                                    <th className="py-2 pl-4 font-medium">
                                        Ditetapkan oleh
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rates.map((r) => (
                                    <tr key={r.id} className="border-t">
                                        <td className="py-2 font-mono text-xs">
                                            {r.effectiveFrom}
                                        </td>
                                        <td className="py-2 text-right font-mono">
                                            {rupiah.format(r.rate)}
                                        </td>
                                        <td className="py-2 pl-4 text-xs">
                                            {r.setBy ?? '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </Section>
            </div>
        </>
    );
}
