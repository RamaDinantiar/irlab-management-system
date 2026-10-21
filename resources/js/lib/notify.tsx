import { AlertTriangle, Check, Info, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'info' | 'warning' | 'error';

/** PRD 7.4: toast hilang otomatis setelah 4 detik. */
export const TOAST_DURATION = 4000;

const TYPES: Record<
    ToastType,
    { title: string; icon: LucideIcon; iconClass: string; barClass: string }
> = {
    success: {
        title: 'Berhasil',
        icon: Check,
        iconClass: 'bg-primary',
        barClass: 'bg-primary',
    },
    info: {
        title: 'Informasi',
        icon: Info,
        iconClass: 'bg-primary-700',
        barClass: 'bg-primary-700',
    },
    warning: {
        title: 'Perhatian',
        icon: AlertTriangle,
        iconClass: 'bg-warning',
        barClass: 'bg-warning',
    },
    error: {
        title: 'Gagal',
        icon: X,
        iconClass: 'bg-danger',
        barClass: 'bg-danger',
    },
};

function ToastCard({
    id,
    type,
    title,
    message,
}: {
    id: string | number;
    type: ToastType;
    title?: string;
    message: string;
}) {
    const {
        title: defaultTitle,
        icon: Icon,
        iconClass,
        barClass,
    } = TYPES[type];

    return (
        <div
            role={type === 'error' ? 'alert' : 'status'}
            className="relative flex w-[min(420px,calc(100vw-2rem))] items-center gap-3 overflow-hidden rounded-sm bg-white px-4 py-3.5 pr-10 shadow-lg ring-1 ring-black/5"
        >
            <span
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-full text-white',
                    iconClass,
                )}
            >
                <Icon className="size-5" strokeWidth={3} aria-hidden />
            </span>
            <div className="min-w-0">
                <p className="font-bold">{title ?? defaultTitle}</p>
                <p className="text-sm">{message}</p>
            </div>
            <button
                type="button"
                onClick={() => toast.dismiss(id)}
                className="absolute top-2 right-2 rounded-xs p-1 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
                <X className="size-4" aria-hidden />
                <span className="sr-only">Tutup notifikasi</span>
            </button>
            <span
                aria-hidden
                className={cn(
                    'absolute bottom-0 left-0 h-1 w-full origin-left animate-[toast-progress_linear_forwards]',
                    barClass,
                )}
                style={{ animationDuration: `${TOAST_DURATION}ms` }}
            />
        </div>
    );
}

function show(type: ToastType, message: string, title?: string) {
    return toast.custom(
        (id) => (
            <ToastCard id={id} type={type} title={title} message={message} />
        ),
        { duration: TOAST_DURATION },
    );
}

/**
 * Toast bergaya Figma. Contoh:
 *   notify.success('Berhasil menyimpan 5 nilai praktikan untuk Pertemuan 04.');
 *   notify.error('Kursi baru saja diambil', 'Kontrak gagal');
 */
export const notify = {
    success: (message: string, title?: string) =>
        show('success', message, title),
    info: (message: string, title?: string) => show('info', message, title),
    warning: (message: string, title?: string) =>
        show('warning', message, title),
    error: (message: string, title?: string) => show('error', message, title),
};
