import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { notify } from '@/lib/notify';
import type { FlashToast } from '@/types/ui';

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.toast as FlashToast | undefined;

            if (!data) {
                return;
            }

            notify[data.type](data.message);
        });
    }, []);
}
