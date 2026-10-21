import { Link } from '@inertiajs/react';
import { CalendarRange, LogOut, Settings } from 'lucide-react';
import { confirmLogout } from '@/components/logout-confirm-dialog';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
    /** Topbar: jabatan/NIM & semester aktif (disembunyikan di topbar sempit). */
    subtitle?: string;
    semester?: string | null;
};

export function UserMenuContent({ user, subtitle, semester }: Props) {
    const cleanup = useMobileNavigation();

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            {(subtitle || semester) && (
                <div className="grid gap-1 px-2 pb-2 text-xs text-muted-foreground">
                    {subtitle && <span>{subtitle}</span>}
                    {semester && (
                        <span className="inline-flex items-center gap-1.5 font-bold text-primary-700">
                            <CalendarRange className="size-3.5" aria-hidden />
                            Semester aktif: {semester}
                        </span>
                    )}
                </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Settings className="mr-2" />
                        Pengaturan Akun
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
                className="cursor-pointer"
                onSelect={confirmLogout}
                data-test="logout-button"
            >
                <LogOut className="mr-2" />
                Keluar
            </DropdownMenuItem>
        </>
    );
}
