import { CheckCircle2, CloudUpload, Trash2, TriangleAlert } from 'lucide-react';
import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { Button } from '@/components/ui/button';
import { formatFileSize } from '@/lib/files';
import { cn } from '@/lib/utils';

type Format = 'pdf' | 'zip';

const BADGE: Record<Format, string> = {
    pdf: 'bg-[#e5322d]',
    zip: 'bg-primary-700',
};

/**
 * Area unggah Figma "Unggah Berkas Pre-Test": klik atau seret & lepas, lalu
 * baris berkas terpilih. Input `name="file"` tetap ikut dikirim oleh <Form>.
 */
export function AnswerDropzone({
    formats,
    limits,
    invalid,
    onChange,
}: {
    formats: Format[];
    /** Batas ukuran per format, MB. */
    limits: Record<Format, number>;
    invalid?: boolean;
    /** Dipanggil saat berkas dipilih/dihapus. */
    onChange?: (file: File | null) => void;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [dragging, setDragging] = useState(false);

    const choose = (next: File | null) => {
        setFile(next);
        onChange?.(next);
    };

    const clear = () => {
        if (input.current) {
            input.current.value = '';
        }

        choose(null);
    };

    const drop = (event: DragEvent) => {
        event.preventDefault();
        setDragging(false);
        const dropped = event.dataTransfer.files[0];

        if (!dropped || !input.current) {
            return;
        }

        const transfer = new DataTransfer();
        transfer.items.add(dropped);
        input.current.files = transfer.files;
        choose(dropped);
    };

    const ext = file?.name.split('.').pop()?.toLowerCase() as
        | Format
        | undefined;
    const problem = !file
        ? null
        : !ext || !formats.includes(ext)
          ? `Format harus ${formats.map((f) => f.toUpperCase()).join(' atau ')}.`
          : file.size > limits[ext] * 1024 * 1024
            ? `Ukuran melebihi ${limits[ext]} MB.`
            : null;

    return (
        <div className="grid gap-4">
            <label
                onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={drop}
                className={cn(
                    'grid cursor-pointer justify-items-center gap-1.5 border-2 border-dashed px-6 py-12 text-center transition-colors has-focus-visible:ring-[3px] has-focus-visible:ring-ring/40',
                    dragging
                        ? 'border-primary-500 bg-primary-50'
                        : invalid
                          ? 'border-danger'
                          : 'border-[#bfbfbf] hover:bg-primary-50/50',
                )}
            >
                <input
                    ref={input}
                    id="answer-file"
                    name="file"
                    type="file"
                    accept={formats.map((f) => `.${f}`).join(',')}
                    onChange={(event) =>
                        choose(event.target.files?.[0] ?? null)
                    }
                    aria-invalid={invalid}
                    className="sr-only"
                />
                <CloudUpload
                    className="size-12 text-muted-foreground"
                    aria-hidden
                />
                <span className="text-base font-medium">
                    Pilih berkas atau seret &amp; lepas di sini
                </span>
                <span className="text-xs text-muted-foreground">
                    {formats
                        .map((f) => `${f} · maks ${limits[f]} MB`)
                        .join(' — ')}
                </span>
                <span className="mt-1 border bg-white px-3 py-1 text-xs font-medium">
                    Telusuri berkas
                </span>
            </label>

            {file && (
                <div className="flex items-center gap-4 border p-4">
                    <span
                        aria-hidden
                        className={cn(
                            'flex size-12 shrink-0 items-center justify-center text-sm font-bold text-white uppercase',
                            ext && formats.includes(ext)
                                ? BADGE[ext]
                                : 'bg-muted-foreground',
                        )}
                    >
                        {ext?.slice(0, 4) ?? '?'}
                    </span>
                    <div className="grid min-w-0 flex-1 gap-1">
                        <span className="truncate text-sm font-bold">
                            {file.name}
                        </span>
                        <span className="flex items-center gap-2 text-xs">
                            <span className="font-mono">
                                {formatFileSize(file.size)}
                            </span>
                            <span aria-hidden>•</span>
                            {problem ? (
                                <span className="flex items-center gap-1 text-danger">
                                    <TriangleAlert
                                        className="size-3.5"
                                        aria-hidden
                                    />
                                    {problem}
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-success">
                                    <CheckCircle2
                                        className="size-3.5"
                                        aria-hidden
                                    />
                                    Siap Dikirim
                                </span>
                            )}
                        </span>
                    </div>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={clear}
                        aria-label={`Hapus ${file.name}`}
                    >
                        <Trash2 />
                    </Button>
                </div>
            )}
        </div>
    );
}
