import { Form } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
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
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import type { AssistantOption, CourseRow } from '@/types';
import type { RouteFormDefinition } from '@/wayfinder';

type Weights = CourseRow['weights'];

const WEIGHT_FIELDS: { key: keyof Weights; name: string; label: string }[] = [
    { key: 'pretest', name: 'weight_pretest', label: 'Pre-test' },
    { key: 'posttest', name: 'weight_posttest', label: 'Post-test' },
    { key: 'report', name: 'weight_report', label: 'Laporan' },
];

/**
 * Form Mata Kuliah (US-D02-1): kode, nama, SKS, bobot (total wajib 100%).
 * Admin juga memilih asisten pengampu; Asisten memakai form yang sama untuk
 * mengajukan / merevisi pengajuan (FR-AS-02).
 */
export function CourseFormDialog({
    action,
    title,
    description,
    submitLabel,
    trigger,
    course,
    semesterId,
    assistants,
}: {
    /** Hasil `Controller.action.form(...)` dari Wayfinder. */
    action: RouteFormDefinition<'post'>;
    title: string;
    description: string;
    submitLabel: string;
    trigger: ReactNode;
    course?: CourseRow;
    /** Admin, mata kuliah baru: semester tujuan. */
    semesterId?: number;
    /** Admin saja: pilihan asisten pengampu. */
    assistants?: AssistantOption[];
}) {
    const [open, setOpen] = useState(false);
    const [weights, setWeights] = useState<Weights>(
        course?.weights ?? { pretest: 20, posttest: 30, report: 50 },
    );
    const total = weights.pretest + weights.posttest + weights.report;
    const selected = new Set(
        course?.assistants?.map((assistant) => assistant.id),
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <Form
                    {...action}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="grid gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            {semesterId !== undefined && (
                                <input
                                    type="hidden"
                                    name="semester_id"
                                    value={semesterId}
                                />
                            )}
                            <div className="grid gap-5 sm:grid-cols-[10rem_1fr]">
                                <div className="grid gap-2">
                                    <Label htmlFor="code">Kode</Label>
                                    <Input
                                        id="code"
                                        name="code"
                                        required
                                        maxLength={20}
                                        defaultValue={course?.code}
                                        placeholder="IF-3104"
                                        className="font-mono uppercase"
                                        aria-invalid={!!errors.code}
                                    />
                                    <InputError message={errors.code} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="course-name">
                                        Nama mata kuliah
                                    </Label>
                                    <Input
                                        id="course-name"
                                        name="name"
                                        required
                                        maxLength={120}
                                        defaultValue={course?.name}
                                        placeholder="Machine Learning"
                                        aria-invalid={!!errors.name}
                                    />
                                    <InputError message={errors.name} />
                                </div>
                            </div>

                            <div className="grid w-32 gap-2">
                                <Label htmlFor="credits">SKS</Label>
                                <Input
                                    id="credits"
                                    name="credits"
                                    type="number"
                                    min={1}
                                    max={6}
                                    required
                                    defaultValue={course?.credits ?? 3}
                                    aria-invalid={!!errors.credits}
                                />
                                <InputError message={errors.credits} />
                            </div>

                            <fieldset className="grid gap-3">
                                <legend className="mb-2 text-sm font-medium">
                                    Bobot nilai akhir (%)
                                </legend>
                                <div className="grid grid-cols-3 gap-3">
                                    {WEIGHT_FIELDS.map((field) => (
                                        <div
                                            key={field.key}
                                            className="grid gap-1.5"
                                        >
                                            <Label
                                                htmlFor={field.name}
                                                className="text-xs"
                                            >
                                                {field.label}
                                            </Label>
                                            <Input
                                                id={field.name}
                                                name={field.name}
                                                type="number"
                                                min={0}
                                                max={100}
                                                required
                                                value={weights[field.key]}
                                                onChange={(event) =>
                                                    setWeights((current) => ({
                                                        ...current,
                                                        [field.key]:
                                                            Number(
                                                                event.target
                                                                    .value,
                                                            ) || 0,
                                                    }))
                                                }
                                                className="text-center font-mono"
                                                aria-invalid={
                                                    !!errors[field.name] ||
                                                    !!errors.weights
                                                }
                                            />
                                        </div>
                                    ))}
                                </div>
                                <p
                                    aria-live="polite"
                                    className={cn(
                                        'text-sm font-medium',
                                        total === 100
                                            ? 'text-success'
                                            : 'text-danger',
                                    )}
                                >
                                    Total {total}%{' '}
                                    {total === 100 ? '✓' : '— harus tepat 100%'}
                                </p>
                                <InputError
                                    message={
                                        errors.weights ??
                                        errors.weight_pretest ??
                                        errors.weight_posttest ??
                                        errors.weight_report
                                    }
                                />
                            </fieldset>

                            {assistants && (
                                <fieldset className="grid gap-2">
                                    <legend className="mb-2 text-sm font-medium">
                                        Asisten pengampu
                                    </legend>
                                    {assistants.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">
                                            Belum ada akun Asisten aktif.
                                        </p>
                                    ) : (
                                        <div className="grid max-h-44 gap-2 overflow-y-auto border bg-white p-3 sm:grid-cols-2">
                                            {assistants.map((assistant) => (
                                                <div
                                                    key={assistant.id}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Checkbox
                                                        id={`assistant-${assistant.id}`}
                                                        name="assistant_ids[]"
                                                        value={String(
                                                            assistant.id,
                                                        )}
                                                        defaultChecked={selected.has(
                                                            assistant.id,
                                                        )}
                                                    />
                                                    <Label
                                                        htmlFor={`assistant-${assistant.id}`}
                                                        className="font-normal"
                                                    >
                                                        {assistant.name}
                                                        {assistant.nim && (
                                                            <span className="ml-1 font-mono text-xs text-muted-foreground">
                                                                {assistant.nim}
                                                            </span>
                                                        )}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <InputError
                                        message={errors.assistant_ids}
                                    />
                                </fieldset>
                            )}

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Batal
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    disabled={processing || total !== 100}
                                >
                                    {processing && <Spinner />}
                                    {submitLabel}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
