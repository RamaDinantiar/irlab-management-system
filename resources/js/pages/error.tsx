import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Ban,
    LogOut,
    SearchX,
    ServerCrash,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { Button } from '@/components/ui/button';
import { dashboard, logout } from '@/routes';

const MESSAGES: Record<
    number,
    { title: string; description: string; icon: LucideIcon }
> = {
    403: {
        title: 'Akses ditolak',
        description:
            'Halaman ini bukan untuk peran akun Anda. Jika menurut Anda ini keliru, hubungi admin lab.',
        icon: Ban,
    },
    404: {
        title: 'Halaman tidak ditemukan',
        description:
            'Alamat yang Anda buka tidak ada atau sudah dipindahkan. Periksa kembali tautannya.',
        icon: SearchX,
    },
    500: {
        title: 'Terjadi kesalahan pada server',
        description:
            'Maaf, ada yang tidak beres di sisi kami. Coba lagi beberapa saat lagi.',
        icon: ServerCrash,
    },
    503: {
        title: 'Sedang dalam pemeliharaan',
        description:
            'Portal sedang diperbarui. Pemeliharaan terjadwal dilakukan di luar jam praktikum.',
        icon: Wrench,
    },
};

/** Halaman error ramah (FR-AUTH-02: URL peran lain → 403). */
export default function ErrorPage({
    status,
    signedInAs,
}: {
    status: number;
    signedInAs?: { name: string; role: string } | null;
}) {
    const {
        title,
        description,
        icon: Icon,
    } = MESSAGES[status] ?? MESSAGES[500];

    return (
        <>
            <Head title={title} />
            <div className="flex min-h-svh flex-col bg-background">
                <header className="flex items-center gap-3 bg-linear-to-br from-primary-800 to-primary px-6 py-4">
                    <AppLogo />
                </header>
                <main className="flex flex-1 items-center justify-center p-6">
                    <div className="flex max-w-lg flex-col items-center gap-4 text-center">
                        <span className="flex size-20 items-center justify-center rounded-full bg-white text-primary-700 ring-8 ring-primary-200/50">
                            <Icon className="size-9" aria-hidden />
                        </span>
                        <p className="font-mono text-sm font-bold text-primary-700">
                            Error {status}
                        </p>
                        <h1 className="text-h1 font-bold text-primary-900">
                            {title}
                        </h1>
                        <p className="text-muted-foreground">{description}</p>
                        {signedInAs && (
                            <p className="border border-warning/30 bg-warning-soft px-4 py-3 text-left text-sm">
                                Anda sedang masuk sebagai{' '}
                                <strong>
                                    {signedInAs.name} ({signedInAs.role})
                                </strong>
                                . Satu browser hanya memakai satu akun: bila
                                Anda baru masuk dengan akun lain di tab lain,
                                tab ini ikut memakai akun tersebut. Masuk
                                kembali dengan akun yang sesuai, atau gunakan
                                jendela penyamaran untuk akun kedua.
                            </p>
                        )}
                        <div className="mt-4 flex flex-wrap justify-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => window.history.back()}
                            >
                                <ArrowLeft /> Kembali
                            </Button>
                            <Button asChild>
                                <Link href={dashboard()}>Ke Dashboard</Link>
                            </Button>
                            {signedInAs && (
                                <Button variant="outline" asChild>
                                    <Link href={logout()} as="button">
                                        <LogOut /> Masuk dengan akun lain
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
