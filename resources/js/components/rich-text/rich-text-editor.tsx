import Placeholder from '@tiptap/extension-placeholder';
import type { JSONContent } from '@tiptap/react';
import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import {
    Bold,
    Code,
    Heading2,
    Heading3,
    Italic,
    List,
    ListOrdered,
    Redo2,
    SquareCode,
    Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { SelectField } from '@/components/select-field';
import { CODE_LANGUAGES } from '@/lib/lowlight';
import { cn } from '@/lib/utils';
import { richTextExtensions } from './extensions';

function ToolbarButton({
    label,
    active,
    onClick,
    children,
}: {
    label: string;
    active?: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className={cn(
                'flex size-8 items-center justify-center text-foreground hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                active && 'bg-primary-100 text-primary-700',
            )}
        >
            {children}
        </button>
    );
}

/**
 * Editor soal (FR-AT-01): Tiptap → JSON, disimpan di input tersembunyi `name`.
 * Tidak ada HTML mentah: viewer merender JSON lewat skema yang sama (aman XSS).
 */
export function RichTextEditor({
    name,
    defaultValue,
    placeholder,
    id,
    invalid,
}: {
    name: string;
    defaultValue?: JSONContent | null;
    placeholder?: string;
    id?: string;
    invalid?: boolean;
}) {
    const [json, setJson] = useState<JSONContent | null>(defaultValue ?? null);

    const editor = useEditor({
        extensions: [
            ...richTextExtensions(),
            Placeholder.configure({
                placeholder: placeholder ?? 'Tulis soal…',
            }),
        ],
        content: defaultValue ?? '',
        immediatelyRender: false,
        editorProps: {
            attributes: {
                ...(id ? { id } : {}),
                class: 'rich-content min-h-48 px-4 py-3 outline-none',
                'aria-multiline': 'true',
                role: 'textbox',
                'aria-label': placeholder ?? 'Isi soal',
            },
        },
        onUpdate: ({ editor: current }) =>
            setJson(current.isEmpty ? null : current.getJSON()),
    });

    const state = useEditorState({
        editor,
        selector: ({ editor: current }) => ({
            bold: current?.isActive('bold') ?? false,
            italic: current?.isActive('italic') ?? false,
            code: current?.isActive('code') ?? false,
            h2: current?.isActive('heading', { level: 2 }) ?? false,
            h3: current?.isActive('heading', { level: 3 }) ?? false,
            bullet: current?.isActive('bulletList') ?? false,
            ordered: current?.isActive('orderedList') ?? false,
            codeBlock: current?.isActive('codeBlock') ?? false,
            language:
                (current?.getAttributes('codeBlock').language as
                    | string
                    | undefined) ?? 'python',
        }),
    });

    const chain = () => editor!.chain().focus();

    return (
        <div
            className={cn(
                'border bg-white focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/25',
                invalid ? 'border-destructive' : 'border-input',
            )}
        >
            <input
                type="hidden"
                name={name}
                value={json ? JSON.stringify(json) : ''}
            />
            {editor && state && (
                <div
                    role="toolbar"
                    aria-label="Format teks"
                    className="flex flex-wrap items-center gap-0.5 border-b bg-primary-50/40 p-1"
                >
                    <ToolbarButton
                        label="Tebal"
                        active={state.bold}
                        onClick={() => chain().toggleBold().run()}
                    >
                        <Bold className="size-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Miring"
                        active={state.italic}
                        onClick={() => chain().toggleItalic().run()}
                    >
                        <Italic className="size-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Kode inline"
                        active={state.code}
                        onClick={() => chain().toggleCode().run()}
                    >
                        <Code className="size-4" />
                    </ToolbarButton>
                    <span className="mx-1 h-5 w-px bg-border" aria-hidden />
                    <ToolbarButton
                        label="Judul"
                        active={state.h2}
                        onClick={() =>
                            chain().toggleHeading({ level: 2 }).run()
                        }
                    >
                        <Heading2 className="size-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Subjudul"
                        active={state.h3}
                        onClick={() =>
                            chain().toggleHeading({ level: 3 }).run()
                        }
                    >
                        <Heading3 className="size-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Daftar berpoin"
                        active={state.bullet}
                        onClick={() => chain().toggleBulletList().run()}
                    >
                        <List className="size-4" />
                    </ToolbarButton>
                    <ToolbarButton
                        label="Daftar bernomor"
                        active={state.ordered}
                        onClick={() => chain().toggleOrderedList().run()}
                    >
                        <ListOrdered className="size-4" />
                    </ToolbarButton>
                    <span className="mx-1 h-5 w-px bg-border" aria-hidden />
                    <ToolbarButton
                        label="Blok kode"
                        active={state.codeBlock}
                        onClick={() =>
                            chain()
                                .toggleCodeBlock({ language: state.language })
                                .run()
                        }
                    >
                        <SquareCode className="size-4" />
                    </ToolbarButton>
                    {state.codeBlock && (
                        <SelectField
                            aria-label="Bahasa blok kode"
                            size="sm"
                            value={state.language}
                            onValueChange={(language) =>
                                chain()
                                    .updateAttributes('codeBlock', { language })
                                    .run()
                            }
                            options={CODE_LANGUAGES.map((language) => ({
                                value: language.value,
                                label: language.label,
                            }))}
                            className="w-auto min-w-32 font-mono text-xs"
                        />
                    )}
                    <span className="ml-auto flex">
                        <ToolbarButton
                            label="Urungkan"
                            onClick={() => chain().undo().run()}
                        >
                            <Undo2 className="size-4" />
                        </ToolbarButton>
                        <ToolbarButton
                            label="Ulangi"
                            onClick={() => chain().redo().run()}
                        >
                            <Redo2 className="size-4" />
                        </ToolbarButton>
                    </span>
                </div>
            )}
            <EditorContent editor={editor} />
        </div>
    );
}
