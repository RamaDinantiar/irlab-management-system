import AppLogo from '@/components/app-logo';
import type { AuthLayoutProps } from '@/types';

/**
 * Figma "Masuk": latar foto, kartu dua panel — kiri gradient teal berisi logo,
 * "Laboratory Portal", deskripsi, dan foto lab; kanan judul + form.
 * Di bawah 768px panel kiri diganti strip logo.
 */
export default function AuthPortalLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="flex min-h-svh items-center justify-center bg-primary-50 bg-[url('/images/login-bg.jpg')] bg-cover bg-center p-4 md:p-8">
            <div className="grid w-full max-w-[1097px] overflow-hidden bg-white shadow-[0_24px_64px_rgb(9_47_56/0.18)] md:min-h-[640px] md:grid-cols-2">
                <aside className="hidden flex-col bg-linear-to-br from-primary-800 to-primary p-10 text-white md:flex">
                    <div className="flex items-center gap-3">
                        <AppLogo />
                    </div>
                    <div className="mt-auto space-y-4">
                        <p className="text-display leading-tight font-bold">
                            Laboratory Portal
                        </p>
                        <p className="max-w-md text-sm">
                            Pusat manajemen praktikum resmi, pengujian algoritma
                            pencarian data masif, repositori modul, dan
                            penilaian komprehensif Lab IR IT PLN.
                        </p>
                        <img
                            src="/images/lab-photo.jpg"
                            alt="Ruang praktikum Lab Information Retrieval"
                            width={475}
                            height={247}
                            className="mt-6 aspect-[475/247] w-full border-4 border-white object-cover"
                        />
                    </div>
                </aside>

                <main className="flex flex-col">
                    <div className="flex items-center gap-3 bg-linear-to-br from-primary-800 to-primary px-6 py-4 md:hidden">
                        <AppLogo />
                    </div>
                    <div className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-10 md:py-12">
                        <div className="mb-8 space-y-3">
                            <h1 className="text-[2rem] leading-tight font-medium sm:text-display">
                                {title}
                            </h1>
                            {description && (
                                <p className="text-lg leading-snug">
                                    {description}
                                </p>
                            )}
                        </div>
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
