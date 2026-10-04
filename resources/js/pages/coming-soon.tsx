import { Head } from '@inertiajs/react';
import { Hammer } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { findNavTrail } from '@/config/navigation';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useNavigation } from '@/hooks/use-navigation';

/** Sementara untuk menu yang halamannya belum dibangun. */
export default function ComingSoon() {
    const { currentUrl } = useCurrentUrl();
    const trail = findNavTrail(useNavigation(), currentUrl);
    const title = trail.map((item) => item.title).join(' – ') || 'Halaman';

    return (
        <>
            <Head title={title} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader title={title} />
                <EmptyState
                    icon={Hammer}
                    title="Segera hadir"
                    description="Halaman ini sedang dibangun dan akan tersedia pada rilis berikutnya."
                />
            </div>
        </>
    );
}
