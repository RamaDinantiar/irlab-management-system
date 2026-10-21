import {
    ChevronDown,
    ChevronUp,
    Download,
    FileText,
    Maximize,
    Minimize,
    RotateCw,
    ScanLine,
    ZoomIn,
    ZoomOut,
} from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

GlobalWorkerOptions.workerSrc = workerUrl;

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;

function PdfPage({
    pdf,
    number,
    scale,
    rotation,
    register,
}: {
    pdf: PDFDocumentProxy;
    number: number;
    scale: number;
    rotation: number;
    register: (number: number, element: HTMLCanvasElement | null) => void;
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
            const viewport = page.getViewport({
                scale: scale * ratio,
                rotation: (page.rotate + rotation) % 360,
            });
            canvas.current.width = viewport.width;
            canvas.current.height = viewport.height;
            canvas.current.style.width = `${viewport.width / ratio}px`;
            task = page.render({ canvas: canvas.current, viewport });
        });

        return () => {
            cancelled = true;
            task?.cancel();
        };
    }, [pdf, number, scale, rotation]);

    return (
        <canvas
            ref={(element) => {
                canvas.current = element;
                register(number, element);
            }}
            data-page={number}
            aria-label={`Halaman ${number}`}
            className="mx-auto block max-w-none bg-white shadow-md"
        />
    );
}

/** Tombol ikon toolbar dokumen. */
function ToolButton({
    label,
    onClick,
    disabled,
    children,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    children: ReactNode;
}) {
    return (
        <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9 text-primary-900"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
        >
            {children}
        </Button>
    );
}

/** Baris judul dokumen (nama file + aksi) — dipakai juga oleh non-PDF. */
export function DocumentToolbar({
    fileName,
    children,
}: {
    fileName: string;
    children?: ReactNode;
}) {
    return (
        <div className="flex min-h-14 flex-wrap items-center gap-x-4 gap-y-1 border-b bg-white px-4 py-2">
            <p className="flex min-w-40 flex-1 items-center gap-2 font-medium text-primary-700">
                <FileText className="size-5 shrink-0" aria-hidden />
                <span className="truncate" title={fileName}>
                    {fileName}
                </span>
            </p>
            {children}
        </div>
    );
}

/**
 * PDF viewer (FR-AG-04) berbasis PDF.js: dirender ke canvas, tanpa menjalankan
 * JavaScript di dalam PDF (NFR-F08: isEvalSupported dimatikan). Toolbar Figma
 * "SPLIT SCREEN REVIEW": halaman, zoom, pas-lebar, putar, unduh, layar penuh.
 */
export function PdfViewer({
    url,
    fileName,
    downloadUrl,
}: {
    url: string;
    fileName: string;
    downloadUrl?: string;
}) {
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [page, setPage] = useState(1);
    const [fullscreen, setFullscreen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const scroller = useRef<HTMLDivElement>(null);
    const pages = useRef(new Map<number, HTMLCanvasElement>());

    useEffect(() => {
        setPdf(null);
        setError(null);
        setPage(1);
        setRotation(0);
        const loading = getDocument({ url, withCredentials: true });
        loading.promise.then(setPdf, () => setError('PDF tidak dapat dibuka.'));

        return () => {
            void loading.destroy();
        };
    }, [url]);

    // Halaman aktif = halaman yang paling banyak terlihat.
    useEffect(() => {
        if (!pdf || !scroller.current) {
            return;
        }

        const visible = new Map<number, number>();
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) =>
                    visible.set(
                        Number((entry.target as HTMLElement).dataset.page),
                        entry.intersectionRatio,
                    ),
                );
                const [best] = [...visible.entries()].sort(
                    (a, b) => b[1] - a[1],
                );

                if (best && best[1] > 0) {
                    setPage(best[0]);
                }
            },
            { root: scroller.current, threshold: [0, 0.25, 0.5, 0.75, 1] },
        );
        pages.current.forEach((element) => observer.observe(element));

        return () => observer.disconnect();
    }, [pdf]);

    useEffect(() => {
        const onChange = () =>
            setFullscreen(document.fullscreenElement === root.current);
        document.addEventListener('fullscreenchange', onChange);

        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    const register = (number: number, element: HTMLCanvasElement | null) => {
        if (element) {
            pages.current.set(number, element);
        } else {
            pages.current.delete(number);
        }
    };

    const goTo = (number: number) => {
        pages.current
            .get(number)
            ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setPage(number);
    };

    const fitWidth = async () => {
        if (!pdf || !scroller.current) {
            return;
        }

        const first = await pdf.getPage(page);
        const { width } = first.getViewport({
            scale: 1,
            rotation: (first.rotate + rotation) % 360,
        });
        const available = scroller.current.clientWidth - 64;
        setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, available / width)));
    };

    const toggleFullscreen = () => {
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void root.current?.requestFullscreen();
        }
    };

    const zoom = (delta: number) =>
        setScale((s) =>
            Math.min(
                MAX_SCALE,
                Math.max(MIN_SCALE, Math.round((s + delta) * 100) / 100),
            ),
        );

    return (
        <div ref={root} className="flex h-full flex-col bg-[#cde7ee]">
            <DocumentToolbar fileName={fileName}>
                {pdf && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <div className="flex items-center gap-1">
                            <ToolButton
                                label="Halaman sebelumnya"
                                onClick={() => goTo(page - 1)}
                                disabled={page <= 1}
                            >
                                <ChevronUp />
                            </ToolButton>
                            <span
                                aria-live="polite"
                                className="min-w-28 text-center text-sm font-medium tabular-nums"
                            >
                                Halaman {page} dari {pdf.numPages}
                            </span>
                            <ToolButton
                                label="Halaman berikutnya"
                                onClick={() => goTo(page + 1)}
                                disabled={page >= pdf.numPages}
                            >
                                <ChevronDown />
                            </ToolButton>
                        </div>
                        <div className="flex items-center gap-0.5">
                            <ToolButton
                                label="Perkecil"
                                onClick={() => zoom(-0.1)}
                                disabled={scale <= MIN_SCALE}
                            >
                                <ZoomOut />
                            </ToolButton>
                            <span className="w-12 text-center text-sm font-bold tabular-nums">
                                {Math.round(scale * 100)}%
                            </span>
                            <ToolButton
                                label="Perbesar"
                                onClick={() => zoom(0.1)}
                                disabled={scale >= MAX_SCALE}
                            >
                                <ZoomIn />
                            </ToolButton>
                            <ToolButton
                                label="Sesuaikan lebar"
                                onClick={() => void fitWidth()}
                            >
                                <ScanLine />
                            </ToolButton>
                            <ToolButton
                                label="Putar 90°"
                                onClick={() =>
                                    setRotation((r) => (r + 90) % 360)
                                }
                            >
                                <RotateCw />
                            </ToolButton>
                        </div>
                        <span
                            aria-hidden
                            className="hidden h-6 w-px bg-input sm:block"
                        />
                        <div className="flex items-center gap-0.5">
                            {downloadUrl && (
                                <Button
                                    asChild
                                    size="icon"
                                    variant="ghost"
                                    className="size-9 text-primary-900"
                                >
                                    <a
                                        href={downloadUrl}
                                        download
                                        aria-label="Unduh"
                                        title="Unduh"
                                    >
                                        <Download />
                                    </a>
                                </Button>
                            )}
                            <ToolButton
                                label={
                                    fullscreen
                                        ? 'Keluar layar penuh'
                                        : 'Layar penuh'
                                }
                                onClick={toggleFullscreen}
                            >
                                {fullscreen ? <Minimize /> : <Maximize />}
                            </ToolButton>
                        </div>
                    </div>
                )}
            </DocumentToolbar>

            {error ? (
                <p className="p-6 text-sm text-danger">{error}</p>
            ) : !pdf ? (
                <p className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                    <Spinner /> Memuat PDF…
                </p>
            ) : (
                <div
                    ref={scroller}
                    className={cn(
                        'flex-1 space-y-6 overflow-auto px-8 py-10',
                        fullscreen && 'bg-[#cde7ee]',
                    )}
                >
                    {Array.from({ length: pdf.numPages }, (_, i) => (
                        <PdfPage
                            key={i}
                            pdf={pdf}
                            number={i + 1}
                            scale={scale}
                            rotation={rotation}
                            register={register}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
