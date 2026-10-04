import { FileCode2, FileX } from 'lucide-react';
import { useEffect, useState } from 'react';
import GradeController from '@/actions/App/Http/Controllers/Asisten/GradeController';
import { Markdown } from '@/components/markdown';
import { Spinner } from '@/components/ui/spinner';
import { formatFileSize } from '@/lib/files';
import { cn } from '@/lib/utils';

type Entry = { path: string; size: number; viewable: boolean };

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
    py: 'python',
    java: 'java',
    cpp: 'cpp',
    cc: 'cpp',
    c: 'cpp',
    h: 'cpp',
    hpp: 'cpp',
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    sql: 'sql',
    kt: 'kotlin',
    sh: 'bash',
    json: 'json',
    xml: 'xml',
    html: 'xml',
};

/**
 * Code Viewer isi ZIP (FR-AG-04, NFR-F07): pohon file + isi file teks ≤ 1 MB,
 * dibaca dari arsip di server; tidak ada eksekusi kode.
 */
export function CodeViewer({
    submissionId,
    entries,
}: {
    submissionId: number;
    entries: Entry[];
}) {
    const first =
        entries.find(
            (entry) =>
                entry.viewable &&
                /\.(py|java|cpp|js|ts|sql|kt|ipynb|md|txt)$/i.test(entry.path),
        ) ?? entries.find((e) => e.viewable);
    const [path, setPath] = useState<string | null>(first?.path ?? null);
    const [file, setFile] = useState<{
        content: string | null;
        reason: string | null;
    } | null>(null);

    useEffect(() => {
        if (!path) {
            return;
        }

        setFile(null);
        const controller = new AbortController();
        fetch(GradeController.zipFile.url(submissionId, { query: { path } }), {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        })
            .then((response) => response.json())
            .then((data) =>
                setFile({ content: data.content, reason: data.reason }),
            )
            .catch(
                () =>
                    !controller.signal.aborted &&
                    setFile({ content: null, reason: 'Gagal memuat file.' }),
            );

        return () => controller.abort();
    }, [submissionId, path]);

    const extension = path?.split('.').pop()?.toLowerCase() ?? '';
    const language =
        LANGUAGE_BY_EXTENSION[extension] ??
        (extension === 'md' ? null : 'plaintext');

    return (
        <div className="grid h-full grid-cols-[minmax(10rem,16rem)_1fr] overflow-hidden">
            <nav
                aria-label="Isi ZIP"
                className="overflow-y-auto border-r bg-white"
            >
                <ul className="py-1 text-sm">
                    {entries.map((entry) => (
                        <li key={entry.path}>
                            <button
                                type="button"
                                disabled={!entry.viewable}
                                onClick={() => setPath(entry.path)}
                                aria-current={
                                    entry.path === path ? 'true' : undefined
                                }
                                className={cn(
                                    'flex w-full items-center gap-1.5 px-3 py-1 text-left font-mono text-xs hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50',
                                    entry.path === path &&
                                        'bg-primary-100 font-bold text-primary-900',
                                )}
                                title={`${entry.path} · ${formatFileSize(entry.size)}`}
                            >
                                <FileCode2
                                    className="size-3.5 shrink-0"
                                    aria-hidden
                                />
                                <span className="truncate">{entry.path}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="overflow-auto bg-white p-4">
                {!path ? (
                    <p className="text-sm text-muted-foreground">
                        ZIP tidak berisi file teks yang dapat ditampilkan.
                    </p>
                ) : !file ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Spinner /> Memuat {path}…
                    </p>
                ) : file.content === null ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileX className="size-4" aria-hidden /> {file.reason}
                    </p>
                ) : (
                    <>
                        <p className="mb-2 font-mono text-xs font-bold text-primary-700">
                            {path}
                        </p>
                        {language === null ? (
                            <Markdown>{file.content}</Markdown>
                        ) : (
                            <Markdown>
                                {'```' +
                                    language +
                                    '\n' +
                                    file.content.replaceAll('```', '`​``') +
                                    '\n```'}
                            </Markdown>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
