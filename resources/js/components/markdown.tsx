import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { LANGUAGES } from '@/lib/lowlight';
import { cn } from '@/lib/utils';

/**
 * Markdown sederhana untuk jawaban teks & feedback (FR-PT-03, FR-PG-02).
 * react-markdown tidak merender HTML mentah → aman dari XSS.
 */
export function Markdown({
    children,
    className,
}: {
    children: string;
    className?: string;
}) {
    return (
        <div className={cn('rich-content', className)}>
            <ReactMarkdown
                rehypePlugins={[
                    [
                        rehypeHighlight,
                        {
                            detect: true,
                            languages: LANGUAGES,
                            plainText: ['plaintext'],
                        },
                    ],
                ]}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
}
