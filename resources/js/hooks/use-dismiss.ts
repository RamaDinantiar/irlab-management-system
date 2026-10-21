import type { RefObject } from 'react';
import { useEffect } from 'react';

/** Tutup popover saat klik di luar `ref` atau menekan Escape. */
export function useDismiss(
    ref: RefObject<HTMLElement | null>,
    open: boolean,
    close: () => void,
): void {
    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointer = (e: PointerEvent) => {
            if (!ref.current?.contains(e.target as Node)) {
                close();
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                close();
            }
        };
        document.addEventListener('pointerdown', onPointer);
        document.addEventListener('keydown', onKey, true);

        return () => {
            document.removeEventListener('pointerdown', onPointer);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [ref, open, close]);
}
