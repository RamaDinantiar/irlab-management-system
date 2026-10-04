import { Head } from '@inertiajs/react';
import { Download, FileText, Lock, Play, Save, SortAsc } from 'lucide-react';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/page-header';
import { StatCard } from '@/components/stat-card';
import { StatusBadge } from '@/components/status-badge';
import type { Status } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { notify } from '@/lib/notify';

const ALL_STATUSES: Status[] = [
    'submitted',
    'late',
    'not_submitted',
    'graded',
    'verified_grade',
    'awaiting_grade',
    'draft',
    'scheduled',
    'open',
    'closed',
    'report_submitted',
    'verified',
    'returned',
    'pending_approval',
    'approved',
    'rejected',
    'expired',
    'present',
    'permit',
    'sick',
    'absent',
];

const STUDENTS: { nim: string; name: string; status: Status; score: string }[] =
    [
        {
            nim: '202331044',
            name: 'Rama Dinantiar',
            status: 'submitted',
            score: '85',
        },
        {
            nim: '202331051',
            name: 'Michael Christia',
            status: 'late',
            score: '',
        },
        {
            nim: '202331067',
            name: 'Yozika Arvio',
            status: 'not_submitted',
            score: '',
        },
    ];

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-4">
            <h2 className="text-h2 font-bold text-primary-700">{title}</h2>
            {children}
        </section>
    );
}

export default function ComponentsCatalog() {
    return (
        <>
            <Head title="Katalog Komponen" />
            <main className="mx-auto max-w-[1440px] space-y-10 p-4 sm:p-8">
                <PageHeader
                    title="Katalog Komponen"
                    description="Komponen dasar IR Lab untuk dicocokkan dengan Figma “Project Lab IR”. Halaman ini hanya ada di lingkungan lokal."
                    actions={
                        <>
                            <Button variant="outline">
                                <Download /> Export CSV
                            </Button>
                            <Button variant="outline">
                                <SortAsc /> Urutkan
                            </Button>
                        </>
                    }
                />

                <Section title="Button">
                    <div className="flex flex-wrap items-center gap-3">
                        <Button>
                            <Save /> Simpan Laporan
                        </Button>
                        <Button variant="outline">Batal</Button>
                        <Button variant="secondary">
                            Simpan Seluruh Nilai
                        </Button>
                        <Button variant="ghost">Ghost</Button>
                        <Button variant="link">Lupa Password?</Button>
                        <Button variant="destructive">Keluarkan</Button>
                        <Button disabled>Nonaktif</Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Button size="sm">Kecil</Button>
                        <Button>Default</Button>
                        <Button size="lg">Masuk</Button>
                        <Button
                            size="icon"
                            variant="outline"
                            aria-label="Unduh"
                        >
                            <Download />
                        </Button>
                    </div>
                </Section>

                <Section title="Form">
                    <div className="grid gap-5 bg-white p-6 md:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="nim">NIM / Email Instansi</Label>
                            <Input
                                id="nim"
                                placeholder="Contoh: 202331044 atau nama@itpln.ac.id"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="kode">Kode MK</Label>
                            <div className="relative">
                                <Input
                                    id="kode"
                                    value="Automatically"
                                    disabled
                                />
                                <Lock className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>Mata Kuliah</Label>
                            <Select defaultValue="mp">
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mp">
                                        Mobile Programming
                                    </SelectItem>
                                    <SelectItem value="ml">
                                        Machine Learning
                                    </SelectItem>
                                    <SelectItem value="dl">
                                        Deep Learning
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="nilai">
                                Input Nilai (tidak valid)
                            </Label>
                            <Input id="nilai" defaultValue="120" aria-invalid />
                            <p className="text-sm text-danger">
                                Nilai harus 0–100.
                            </p>
                        </div>
                        <div className="grid gap-2 md:col-span-2">
                            <Label htmlFor="desc">Deskripsi Kegiatan</Label>
                            <Textarea
                                id="desc"
                                placeholder="Deskripsikan kegiatan mengawas..."
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox id="remember" defaultChecked />
                            <Label htmlFor="remember">
                                Ingatkan saya di perangkat ini
                            </Label>
                        </div>
                    </div>
                </Section>

                <Section title="Badge & Status">
                    <div className="flex flex-wrap gap-2">
                        <Badge>Kelas A</Badge>
                        <Badge variant="muted">Kelas D</Badge>
                        <Badge variant="secondary">Formulir Shift</Badge>
                        <Badge variant="secondary" className="font-mono">
                            90 / 100
                        </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {ALL_STATUSES.map((status) => (
                            <StatusBadge key={status} status={status} />
                        ))}
                    </div>
                </Section>

                <Section title="Kartu">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            label="Nilai Akhir Kumulatif"
                            value="80"
                            suffix="/100"
                            footer={<Badge variant="success">Grade: B</Badge>}
                        />
                        <StatCard
                            label="Rata-rata Pre-Test"
                            value="82.5"
                            suffix="/100"
                            footer="4 dari 8 Pertemuan"
                        />
                        <StatCard
                            label="Rata-rata Post-Test"
                            value="85"
                            suffix="/100"
                            footer="4 dari 8 Pertemuan"
                        />
                        <StatCard
                            label="Kehadiran Praktikum"
                            value="100%"
                            suffix="4/4 Hadir"
                            footer="Kursi Lab: PC-12"
                        />
                    </div>
                    <Card className="max-w-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <Badge>Kelas A</Badge>
                                <span className="text-h3 font-bold">
                                    80 / B
                                </span>
                            </div>
                            <CardTitle>Mobile Programming</CardTitle>
                            <CardDescription>
                                Senin, 13:00 – 14:40 WIB
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="text-xs">
                            Dosen: Yozika Arvio, M.Kom
                        </CardContent>
                    </Card>
                </Section>

                <Section title="Tabel">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>NIM</TableHead>
                                <TableHead>Nama Praktikan</TableHead>
                                <TableHead>Status Pengumpulan</TableHead>
                                <TableHead>Lampiran Tugas</TableHead>
                                <TableHead>Input Nilai</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {STUDENTS.map((s, i) => (
                                <TableRow key={s.nim} data-dirty={i === 1}>
                                    <TableCell className="font-mono font-bold text-primary-700">
                                        {s.nim}
                                    </TableCell>
                                    <TableCell>{s.name}</TableCell>
                                    <TableCell>
                                        <StatusBadge status={s.status} />
                                    </TableCell>
                                    <TableCell>
                                        {s.status !== 'not_submitted' && (
                                            <Badge variant="secondary">
                                                <FileText /> PostTest1.pdf
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            className="w-24 text-center"
                                            defaultValue={s.score}
                                            placeholder="0 - 100"
                                            aria-label={`Nilai ${s.name}`}
                                        />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Section>

                <Section title="Modal & Toast">
                    <div className="flex flex-wrap gap-3">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button>
                                    <Play /> Buka Modal
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Gabung Kelas</DialogTitle>
                                    <DialogDescription>
                                        Masukkan 6 karakter kode kelas dari
                                        asisten.
                                    </DialogDescription>
                                </DialogHeader>
                                <Input
                                    className="text-center font-mono text-lg tracking-[0.5em] uppercase"
                                    maxLength={6}
                                    placeholder="ABC234"
                                    aria-label="Kode kelas"
                                />
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button variant="outline">Batal</Button>
                                    </DialogClose>
                                    <Button>Gabung</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button
                            variant="outline"
                            onClick={() =>
                                notify.success(
                                    'Berhasil menyimpan 5 nilai praktikan untuk Modul 04.',
                                )
                            }
                        >
                            Toast sukses
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() =>
                                notify.error(
                                    'Kursi baru saja diambil praktikan lain.',
                                )
                            }
                        >
                            Toast gagal
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() =>
                                notify.warning(
                                    'Tenggat tugas kurang dari 24 jam.',
                                )
                            }
                        >
                            Toast peringatan
                        </Button>
                    </div>
                </Section>
            </main>
        </>
    );
}
