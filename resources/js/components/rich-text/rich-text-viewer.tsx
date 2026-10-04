import type { JSONContent } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { richTextExtensions } from './extensions';

/** Render soal (FR-PT-02): JSON Tiptap → tampilan read-only dengan highlight kode. */
export function RichTextViewer({
    content,
    className,
}: {
    content: JSONContent | null;
    className?: string;
}) {
    const editor = useEditor(
        {
            extensions: richTextExtensions(),
            content: content ?? '',
            editable: false,
            immediatelyRender: false,
            editorProps: {
                attributes: {
                    class: cn('rich-content outline-none', className),
                },
            },
        },
        [JSON.stringify(content)],
    );

    if (!content) {
        return (
            <p className="text-sm text-muted-foreground">
                Tidak ada uraian soal.
            </p>
        );
    }

    return <EditorContent editor={editor} />;
}
