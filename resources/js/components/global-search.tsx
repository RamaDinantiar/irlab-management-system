import { router } from '@inertiajs/react';
import { CornerDownLeft, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import SearchController from '@/actions/App/Http/Controllers/SearchController';
import { cn } from '@/lib/utils';

type Group = {
    label: string;
    items: { title: string; subtitle: string; href: string }[];
};

/**
 * Pencarian global topbar (PRD): Ctrl/⌘ + K. Hasil tampil sebagai dropdown
 * tepat di bawah kolom cari (tanpa overlay). Di bawah xl kolom diganti ikon
 * yang membuka panel selebar topbar (posisi relatif ke <header> sticky).
 */
export function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const fieldRef = useRef<HTMLInputElement>(null);
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

                // Kolom cari terlihat (≥ xl) → fokus; selain itu buka panel.
                if (fieldRef.current?.offsetParent) {
                    fieldRef.current.focus();
                    setOpen(true);
                } else {
                    setOpen((o) => !o);
                }
            }
        };
        window.addEventListener('keydown', onKey);

        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointer = (e: PointerEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointer);

        return () => document.removeEventListener('pointerdown', onPointer);
    }, [open]);

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

    const close = () => {
        setOpen(false);
        fieldRef.current?.blur();
    };

    const go = (href: string) => {
        close();
        setQ('');
        router.visit(href);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
        } else if (e.key === 'ArrowDown') {
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
        <div ref={rootRef} className="xl:relative">
            <label className="hidden h-10 items-center gap-2 border border-primary-200 bg-white px-3 text-sm focus-within:border-primary-500 focus-within:ring-[3px] focus-within:ring-ring/25 hover:border-primary-400 xl:flex xl:w-80 2xl:w-[28rem]">
                {loading ? (
                    <Loader2
                        className="size-4 shrink-0 animate-spin text-muted-foreground"
                        aria-hidden
                    />
                ) : (
                    <Search
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                    />
                )}
                <input
                    ref={fieldRef}
                    value={q}
                    onChange={(e) => {
                        setQ(e.target.value);
                        setOpen(true);
                    }}
                    onKeyDown={onKeyDown}
                    aria-label="Pencarian global"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls="search-results"
                    aria-activedescendant={
                        open && flat[active]
                            ? `search-item-${active}`
                            : undefined
                    }
                    onFocus={() => setOpen(true)}
                    placeholder="Cari…"
                    className="h-full min-w-0 flex-1 bg-transparent placeholder:text-muted-foreground focus-visible:outline-none"
                />
                {!open && !q && (
                    <kbd className="border border-primary-200 bg-primary-50 px-1.5 py-0.5 font-mono text-[10px] text-primary-700">
                        Ctrl K
                    </kbd>
                )}
            </label>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label="Cari"
                aria-expanded={open}
                className={cn(
                    'flex size-10 items-center justify-center rounded-full text-primary-700 hover:bg-primary-50 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none xl:hidden',
                    open && 'bg-primary-50',
                )}
            >
                <Search className="size-5" />
            </button>

            {open && (
                <div className="absolute inset-x-4 top-full z-50 mt-2 border border-primary-200 bg-popover text-popover-foreground shadow-lg md:inset-x-6 xl:inset-x-0">
                    <div className="flex items-center gap-3 border-b px-4 xl:hidden">
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
                            onChange={(e) => {
                                setQ(e.target.value);
                                setOpen(true);
                            }}
                            onKeyDown={onKeyDown}
                            aria-label="Pencarian global"
                            role="combobox"
                            aria-expanded={open}
                            aria-controls="search-results"
                            aria-activedescendant={
                                open && flat[active]
                                    ? `search-item-${active}`
                                    : undefined
                            }
                            placeholder="Cari tugas, pertemuan, praktikan, kelas…"
                            className="h-12 flex-1 bg-transparent text-sm focus-visible:outline-none"
                        />
                    </div>
                    <div
                        ref={listRef}
                        id="search-results"
                        role="listbox"
                        className="max-h-[min(60vh,28rem)] overflow-y-auto"
                    >
                        {q.trim().length < 2 ? (
                            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                                Ketik minimal 2 huruf untuk mencari tugas,
                                pertemuan, praktikan, kelas, atau program.
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
                </div>
            )}
        </div>
    );
}
