import type { NotificationItem } from '@/types/announcement';
import type { Auth } from '@/types/auth';
import type { FlashToast } from '@/types/ui';
import type { ImportResult, IssuedCredentials } from '@/types/user';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        /** Data flash sekali-tampil dari server (Inertia::flash). */
        flashDataType: {
            toast?: FlashToast;
            credentials?: IssuedCredentials;
            importResult?: ImportResult;
        };
        sharedPageProps: {
            name: string;
            auth: Auth;
            /** Semester berstatus Aktif (FR-ADM-02); null bila belum ada. */
            activeSemester: { id: number; name: string } | null;
            /** Lonceng: jumlah belum dibaca + 8 terbaru. */
            notifications: { unread: number; items: NotificationItem[] } | null;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
