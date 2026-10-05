import { router } from '@inertiajs/react';
import { CornerDownLeft, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import SearchController from '@/actions/App/Http/Controllers/SearchController';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Group = {
    label: string;
    items: { title: string; subtitle: string; href: string }[];
};

/** Pencarian global topbar (PRD): Ctrl/⌘ + K. */
export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [active, setActive] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen((o) => !o);
            }
        };
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (q.trim().length < 2) {
            setGroups([]);

            return;
        }

        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            setLoading(true);
            fetch(SearchController.url({ query: { q } }), {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            })
                .then((r) => r.json())
                .then((data: Group[]) => {
                    setGroups(data);
                    setActive(0);
                })
                .catch(() => {})
                .finally(() => setLoading(false));
        }, 250);

        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [q]);

    const go = (href: string) => {
        setOpen(false);
        setQ('');
        router.visit(href);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(flat.length - 1, a + 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
        } else if (e.key === 'Enter' && flat[active]) {
            e.preventDefault();
            go(flat[active].href);
        }
    };

    useEffect(() => {
        listRef.current
            ?.querySelector(`[data-index="${active}"]`)
            ?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    let index = -1;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="hover:border-primary-400 hidden h-9 w-64 items-center gap-2 border border-primary-200 bg-white px-3 text-sm text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none md:flex"
            >
                <Search className="size-4" aria-hidden />
                <span className="flex-1 text-left">Cari…</span>
                <kbd className="border bg-muted px-1.5 font-mono text-[10px]">
                    Ctrl K
                </kbd>
            </button>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Cari"
                className="flex size-10 items-center justify-center rounded-full text-primary-700 hover:bg-primary-50 md:hidden"
            >
                <Search className="size-5" />
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="top-[15%] translate-y-0 gap-0 p-0 sm:max-w-xl">
                    <DialogTitle className="sr-only">
                        Pencarian global
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Ketik minimal 2 huruf. Gunakan panah atas/bawah dan
                        Enter.
                    </DialogDescription>
                    <div className="flex items-center gap-3 border-b px-4">
                        {loading ? (
                            <Loader2
                                className="size-4 animate-spin text-muted-foreground"
                                aria-hidden
                            />
                        ) : (
                            <Search
                                className="size-4 text-muted-foreground"
                                aria-hidden
                            />
                        )}
                        <input
                            autoFocus
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            onKeyDown={onKeyDown}
                            placeholder="Cari tugas, modul, praktikan, kelas, program…"
                            aria-label="Kata kunci"
                            role="combobox"
                            aria-expanded={flat.length > 0}
                            aria-controls="search-results"
                            aria-activedescendant={
                                flat[active]
                                    ? `search-item-${active}`
                                    : undefined
                            }
                            className="h-12 flex-1 bg-transparent text-sm focus-visible:outline-none"
                        />
                    </div>
                    <div
                        ref={listRef}
                        id="search-results"
                        role="listbox"
                        className="max-h-[60vh] overflow-y-auto"
                    >
                        {q.trim().length < 2 ? (
                            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                Ketik minimal 2 huruf.
                            </p>
                        ) : !loading && groups.length === 0 ? (
                            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                Tidak ada hasil untuk “{q}”.
                            </p>
                        ) : (
                            groups.map((g) => (
                                <div
                                    key={g.label}
                                    role="group"
                                    aria-label={g.label}
                                    className="py-1"
                                >
                                    <p className="px-4 py-1.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase">
                                        {g.label}
                                    </p>
                                    {g.items.map((item) => {
                                        index++;
                                        const i = index;

                                        return (
                                            <button
                                                key={`${g.label}-${item.href}-${item.title}`}
                                                id={`search-item-${i}`}
                                                data-index={i}
                                                role="option"
                                                aria-selected={active === i}
                                                type="button"
                                                onMouseEnter={() =>
                                                    setActive(i)
                                                }
                                                onClick={() => go(item.href)}
                                                className={cn(
                                                    'flex w-full items-center gap-3 px-4 py-2.5 text-left',
                                                    active === i &&
                                                        'bg-primary-50',
                                                )}
                                            >
                                                <span className="grid min-w-0 flex-1">
                                                    <span className="truncate text-sm font-medium">
                                                        {item.title}
                                                    </span>
                                                    <span className="truncate text-xs text-muted-foreground">
                                                        {item.subtitle}
                                                    </span>
                                                </span>
                                                {active === i && (
                                                    <CornerDownLeft
                                                        className="size-4 text-muted-foreground"
                                                        aria-hidden
                                                    />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
