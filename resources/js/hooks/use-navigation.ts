import { usePage } from '@inertiajs/react';
import { navigation } from '@/config/navigation';
import type { NavGroup } from '@/types';

/** Menu sidebar untuk peran user yang sedang login. */
export function useNavigation(): NavGroup[] {
    const { auth } = usePage().props;

    return auth.user ? navigation[auth.user.role] : [];
}
