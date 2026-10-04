import { Eye, EyeOff } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, Ref } from 'react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function PasswordInput({
    className,
    ref,
    icon: Icon,
    ...props
}: Omit<ComponentProps<'input'>, 'type'> & {
    ref?: Ref<HTMLInputElement>;
    /** Ikon di sisi kiri, mis. kunci pada form login (Figma). */
    icon?: LucideIcon;
}) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <div className="relative">
            {Icon && (
                <Icon
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-primary-200"
                />
            )}
            <Input
                type={showPassword ? 'text' : 'password'}
                className={cn('pr-11', Icon && 'pl-11', className)}
                ref={ref}
                {...props}
            />
            <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-3.5 text-primary hover:text-primary-700 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                aria-label={
                    showPassword
                        ? 'Sembunyikan kata sandi'
                        : 'Tampilkan kata sandi'
                }
                aria-pressed={showPassword}
            >
                {showPassword ? (
                    <EyeOff className="size-5" />
                ) : (
                    <Eye className="size-5" />
                )}
            </button>
        </div>
    );
}
