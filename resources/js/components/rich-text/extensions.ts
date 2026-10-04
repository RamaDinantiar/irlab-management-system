import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Link from '@tiptap/extension-link';
import StarterKit from '@tiptap/starter-kit';
import { lowlight } from '@/lib/lowlight';

/** Ekstensi Tiptap yang sama untuk editor & viewer (JSON → tampilan konsisten). */
export function richTextExtensions() {
    return [
        StarterKit.configure({
            codeBlock: false,
            link: false,
            heading: { levels: [2, 3] },
        }),
        CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'python' }),
        Link.configure({
            openOnClick: false,
            autolink: true,
            protocols: ['http', 'https'],
            HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
        }),
    ];
}
