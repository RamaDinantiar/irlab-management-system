import { Form, usePage } from '@inertiajs/react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
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
import { Spinner } from '@/components/ui/spinner';
import type { ImportResult } from '@/types';
import type { RouteFormDefinition } from '@/wayfinder';

/** PRD A1 / US-D04-1: import akun praktikan dari CSV/XLSX + laporan baris gagal. */
export function ImportUsersDialog({
    action = UserController.import.form(),
    title = 'Import akun praktikan',
    description,
    triggerLabel = 'Import Praktikan',
    templateUrl = UserController.template.url(),
}: {
    action?: RouteFormDefinition<'post'>;
    title?: string;
    description?: ReactNode;
    triggerLabel?: string;
    templateUrl?: string | null;
} = {}) {
    const [open, setOpen] = useState(false);
    const { flash } = usePage();
    const [result, setResult] = useState<ImportResult | null>(null);

    useEffect(() => {
        if (flash?.importResult) {
            setResult(flash.importResult);
        }
    }, [flash?.importResult]);

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Upload /> {triggerLabel}
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{title}</DialogTitle>
                        <DialogDescription>
                            {description ?? (
                                <>
                                    CSV atau XLSX (maks. 1.000 baris, 2 MB)
                                    dengan kolom{' '}
                                    <span className="font-mono">
                                        nim, nama, email, jurusan, angkatan
                                    </span>
                                    . Setiap akun mendapat password sementara
                                    lewat email.
                                </>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    {templateUrl && (
                        <a
                            href={templateUrl}
                            className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-primary-700 underline decoration-primary-200 underline-offset-4 hover:decoration-current"
                        >
                            <Download className="size-4" aria-hidden /> Unduh
                            template CSV
                        </a>
                    )}
                    <Form
                        {...action}
                        options={{ preserveScroll: true }}
                        onSuccess={() => setOpen(false)}
                        className="grid gap-4"
                    >
                        {({ processing, errors, progress }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="import-file">File</Label>
                                    <Input
                                        id="import-file"
                                        name="file"
                                        type="file"
                                        required
                                        accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                        aria-invalid={!!errors.file}
                                    />
                                    {progress && (
                                        <div
                                            role="progressbar"
                                            aria-label="Mengunggah"
                                            aria-valuenow={progress.percentage}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            className="h-1.5 bg-primary-50"
                                        >
                                            <div
                                                className="h-full bg-primary"
                                                style={{
                                                    width: `${progress.percentage}%`,
                                                }}
                                            />
                                        </div>
                                    )}
                                    <InputError message={errors.file} />
                                </div>
                                <DialogFooter>
                                    <DialogClose asChild>
                                        <Button type="button" variant="outline">
                                            Batal
                                        </Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={processing}>
                                        {processing ? (
                                            <Spinner />
                                        ) : (
                                            <FileSpreadsheet />
                                        )}
                                        Import
                                    </Button>
                                </DialogFooter>
                            </>
                        )}
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Laporan hasil import */}
            <Dialog
                open={result !== null}
                onOpenChange={(next) => !next && setResult(null)}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Hasil import</DialogTitle>
                        <DialogDescription>
                            {result?.created} dari {result?.total} baris
                            berhasil dibuat.
                            {result &&
                                result.failed.length > 0 &&
                                ' Perbaiki baris di bawah lalu import ulang file berisi baris tersebut saja.'}
                        </DialogDescription>
                    </DialogHeader>
                    {result && result.failed.length > 0 && (
                        <div className="max-h-80 overflow-y-auto border">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-primary-100 text-left font-mono">
                                    <tr>
                                        <th className="px-3 py-2">Baris</th>
                                        <th className="px-3 py-2">NIM</th>
                                        <th className="px-3 py-2">Masalah</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-primary-50">
                                    {result.failed.map((failure) => (
                                        <tr key={failure.row}>
                                            <td className="px-3 py-2 align-top font-mono">
                                                {failure.row}
                                            </td>
                                            <td className="px-3 py-2 align-top font-mono">
                                                {failure.nim ?? '—'}
                                            </td>
                                            <td className="px-3 py-2 text-danger">
                                                <ul className="list-disc pl-4">
                                                    {failure.errors.map(
                                                        (error) => (
                                                            <li key={error}>
                                                                {error}
                                                            </li>
                                                        ),
                                                    )}
                                                </ul>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button>Tutup</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
