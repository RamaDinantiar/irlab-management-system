import { Head, Link } from '@inertiajs/react';
import { Hourglass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';

/**
 * Semua halaman Program selama fiturnya ditutup (LAB_PROGRAMS_ENABLED).
 * Gaya mengikuti frame Figma "No Schedule": latar grid, ikon, judul, tombol.
 */
export default function ProgramUnavailable({
    program,
}: {
    program: string | null;
}) {
    const title = program ?? 'Program';

    return (
        <>
            <Head title={title} />
            {/* Inline style: url di CSS akan dimuat dari server Vite saat dev. */}
            <div
                className="flex flex-1 items-center justify-center bg-white bg-cover bg-center px-4 py-24"
                style={{ backgroundImage: "url('/images/empty-grid.jpg')" }}
            >
                <div className="flex max-w-lg flex-col items-center gap-2 text-center text-primary-900">
                    <Hourglass
                        className="mb-2 size-16 text-primary-700"
                        strokeWidth={1.75}
                        aria-hidden
                    />
                    <h1 className="text-[2.375rem] leading-tight font-bold">
                        {title}
                    </h1>
                    <p className="text-h3 font-medium">
                        Fitur ini belum tersedia di Lab IR.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Halaman ini sedang kami siapkan dan akan dibuka kembali
                        setelah siap digunakan.
                    </p>
                    <Button asChild className="mt-6">
                        <Link href={dashboard()}>Kembali ke Dashboard</Link>
                    </Button>
                </div>
            </div>
        </>
    );
}
