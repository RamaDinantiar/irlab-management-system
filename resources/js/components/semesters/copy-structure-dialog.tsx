import { Form } from '@inertiajs/react';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import SemesterController from '@/actions/App/Http/Controllers/Admin/SemesterController';
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
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import type { SemesterRow } from '@/types';

/**
 * US-D01-3: salin struktur (Mata Kuliah & bobot) dari semester lain, tanpa
 * data praktikan, submission, nilai, dan asisten pengampu.
 */
export function CopyStructureDialog({
    target,
    sources,
}: {
    target: SemesterRow;
    sources: SemesterRow[];
}) {
    const [open, setOpen] = useState(false);
    const [sourceId, setSourceId] = useState<string>('');

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                setSourceId('');
            }}
        >
            <DialogTrigger asChild>
                <Button
                    size="sm"
                    variant="outline"
                    disabled={sources.length === 0}
                >
                    <Copy /> Salin Struktur
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Salin struktur ke {target.name}</DialogTitle>
                    <DialogDescription>
                        Mata kuliah yang disetujui beserta SKS dan bobot
                        nilainya disalin. Data praktikan, submission, nilai, dan
                        asisten pengampu tidak ikut. Kode yang sudah ada di{' '}
                        {target.name} dilewati.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...SemesterController.copyStructure.form(target.id)}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="grid gap-4"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor={`source-${target.id}`}>
                                    Salin dari semester
                                </Label>
                                <Select
                                    name="source_id"
                                    value={sourceId}
                                    onValueChange={setSourceId}
                                >
                                    <SelectTrigger
                                        id={`source-${target.id}`}
                                        className="w-full"
                                    >
                                        <SelectValue placeholder="Pilih semester sumber" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sources.map((source) => (
                                            <SelectItem
                                                key={source.id}
                                                value={String(source.id)}
                                            >
                                                {source.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <InputError message={errors.source_id} />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Batal
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    disabled={processing || !sourceId}
                                >
                                    {processing && <Spinner />}
                                    Salin Struktur
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
