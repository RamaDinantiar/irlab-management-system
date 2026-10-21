// Credit: https://usehooks-ts.com/
import { useState } from 'react';
import { notify } from '@/lib/notify';

export type CopiedValue = string | null;
export type CopyFn = (text: string) => Promise<boolean>;
export type UseClipboardReturn = [CopiedValue, CopyFn];

/**
 * Cadangan untuk konteks tidak aman (mis. http://ir-lab.test): di sana
 * `navigator.clipboard` tidak tersedia, jadi salin lewat textarea tersembunyi.
 */
function legacyCopy(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        return document.execCommand('copy');
    } catch {
        return false;
    } finally {
        textarea.remove();
    }
}

export function useClipboard(): UseClipboardReturn {
    const [copiedText, setCopiedText] = useState<CopiedValue>(null);

    const copy: CopyFn = async (text) => {
        let ok = false;

        if (window.isSecureContext && navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(text);
                ok = true;
            } catch {
                ok = legacyCopy(text);
            }
        } else {
            ok = legacyCopy(text);
        }

        setCopiedText(ok ? text : null);

        if (!ok) {
            notify.error(
                'Browser menolak akses clipboard. Salin secara manual.',
                'Gagal menyalin',
            );
        }

        return ok;
    };

    return [copiedText, copy];
}
