import { Minus, Plus } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

GlobalWorkerOptions.workerSrc = workerUrl;

function PdfPage({
    pdf,
    number,
    scale,
}: {
    pdf: PDFDocumentProxy;
    number: number;
    scale: number;
}) {
    const canvas = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let cancelled = false;
        let task: { cancel: () => void } | null = null;

        void pdf.getPage(number).then((page) => {
            if (cancelled || !canvas.current) {
                return;
            }

            const ratio = window.devicePixelRatio || 1;
            const viewport = page.getViewport({ scale: scale * ratio });
            canvas.current.width = viewport.width;
            canvas.current.height = viewport.height;
            canvas.current.style.width = `${viewport.width / ratio}px`;
            task = page.render({ canvas: canvas.current, viewport });
        });

        return () => {
            cancelled = true;
            task?.cancel();
        };
    }, [pdf, number, scale]);

    return (
        <canvas
            ref={canvas}
            aria-label={`Halaman ${number}`}
            className="mx-auto block bg-white shadow"
        />
    );
}

/**
 * PDF viewer (FR-AG-04) berbasis PDF.js: dirender ke canvas, tanpa menjalankan
 * JavaScript di dalam PDF (NFR-F08: isEvalSupported dimatikan).
 */
export function PdfViewer({ url }: { url: string }) {
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1.1);

    useEffect(() => {
        setPdf(null);
        setError(null);
        const loading = getDocument({ url, withCredentials: true });
        loading.promise.then(setPdf, () => setError('PDF tidak dapat dibuka.'));

        return () => {
            void loading.destroy();
        };
    }, [url]);

    if (error) {
        return <p className="p-6 text-sm text-danger">{error}</p>;
    }

    if (!pdf) {
        return (
            <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Spinner /> Memuat PDF…
            </p>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center gap-2 border-b bg-white px-3 py-1.5 text-sm">
                <span className="font-mono text-xs">
                    {pdf.numPages} halaman
                </span>
                <span className="ml-auto flex items-center gap-1">
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
                        aria-label="Perkecil"
                    >
                        <Minus />
                    </Button>
                    <span className="w-12 text-center font-mono text-xs">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => setScale((s) => Math.min(3, s + 0.15))}
                        aria-label="Perbesar"
                    >
                        <Plus />
                    </Button>
                </span>
            </div>
            <div className="flex-1 space-y-4 overflow-auto bg-muted p-4">
                {Array.from({ length: pdf.numPages }, (_, i) => (
                    <PdfPage key={i} pdf={pdf} number={i + 1} scale={scale} />
                ))}
            </div>
        </div>
    );
}
