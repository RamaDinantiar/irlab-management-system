import { useFlashToast } from '@/hooks/use-flash-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

/** Toast dirender lewat `notify` (lib/notify.tsx) agar sesuai desain Figma. */
function Toaster({ ...props }: ToasterProps) {
    const isMobile = useIsMobile();

    useFlashToast();

    return (
        <Sonner
            theme="light"
            // PRD 7.4: kanan atas di desktop, bawah di mobile
            position={isMobile ? 'bottom-center' : 'top-right'}
            className="toaster group"
            {...props}
        />
    );
}

export { Toaster };
