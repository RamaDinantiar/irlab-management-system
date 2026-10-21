import { Link } from '@inertiajs/react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Props = ComponentProps<typeof Link>;

/** Gaya tautan teks, dipakai juga oleh tombol yang tampil seperti tautan. */
export const textLinkClass =
    'font-medium text-primary-700 underline decoration-primary-200 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current!';

export default function TextLink({
    className = '',
    children,
    ...props
}: Props) {
    return (
        <Link className={cn(textLinkClass, className)} {...props}>
            {children}
        </Link>
    );
}
