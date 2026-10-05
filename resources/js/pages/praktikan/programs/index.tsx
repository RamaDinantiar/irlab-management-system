import { Head, Link } from '@inertiajs/react';
import { AppWindow, CalendarDays, MapPin, Users } from 'lucide-react';
import { useState } from 'react';
import ProgramController from '@/actions/App/Http/Controllers/Praktikan/ProgramController';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { formatRelative } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import { PROGRAM_STATUS, REGISTRATION_STATUS } from '@/types';
import type { ProgramCard, ProgramTypeInfo, RegistrationStatus } from '@/types';

type Mine = {
    id: number;
    programId: number;
    title: string;
    type: string;
    status: RegistrationStatus;
    startsAt: string | null;
    createdAt: string;
};

const TYPE_LABEL = {
    workshop: 'Workshop',
    quick_tutor: 'Quick Tutor',
    recruitment: 'Rekrutmen Asisten',
    maintenance: 'Maintenance',
} as const;
const when = (iso: string | null) =>
    iso
        ? new Date(iso).toLocaleDateString('id-ID', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : null;

/** Praktikan › Program (FR-PP-01/03): etalase + Program Saya. */
export default function PraktikanPrograms({
    type,
    programs,
    mine,
}: {
    type: ProgramTypeInfo | null;
    programs: ProgramCard[];
    mine: Mine[];
}) {
    const [tab, setTab] = useState<'catalog' | 'mine'>('catalog');

    return (
        <>
            <Head title={type ? type.label : 'Program'} />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title={type ? type.label : 'Program Lab'}
                    description="Workshop, Quick Tutor, dan Rekrutmen Asisten yang dibuka Laboratorium Information Retrieval."
                />
                <div
                    role="tablist"
                    className="flex gap-6 border-b border-primary-200"
                >
                    {(
                        [
                            ['catalog', 'Etalase Program'],
                            ['mine', `Program Saya (${mine.length})`],
                        ] as const
                    ).map(([value, label]) => (
                        <button
                            key={value}
                            role="tab"
                            aria-selected={tab === value}
                            onClick={() => setTab(value)}
                            className={cn(
                                '-mb-px border-b-2 px-1 pb-2.5 text-sm font-bold',
                                tab === value
                                    ? 'border-primary-700 text-primary-800'
                                    : 'border-transparent text-muted-foreground',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'catalog' ? (
                    programs.length === 0 ? (
                        <EmptyState
                            icon={AppWindow}
                            title="Belum ada program"
                            description="Program yang dibuka akan tampil di sini. Pantau pengumuman lab."
                        />
                    ) : (
                        <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {programs.map((p) => {
                                const pct = p.quota
                                    ? Math.min(
                                          100,
                                          Math.round(
                                              (p.registered / p.quota) * 100,
                                          ),
                                      )
                                    : null;

                                return (
                                    <li key={p.id}>
                                        <Link
                                            href={ProgramController.show.url(
                                                p.id,
                                            )}
                                            className="grid h-full content-start overflow-hidden border bg-card shadow-sm transition-colors hover:border-primary-500 focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none"
                                        >
                                            <div className="relative aspect-video bg-gradient-to-br from-primary-800 to-primary-500">
                                                {p.poster ? (
                                                    <img
                                                        src={p.poster}
                                                        alt=""
                                                        className="size-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="absolute inset-0 flex items-center justify-center p-6 text-center text-h3 font-bold text-white/90">
                                                        {p.title}
                                                    </span>
                                                )}
                                                <Badge
                                                    variant={
                                                        p.accepting
                                                            ? 'success'
                                                            : PROGRAM_STATUS[
                                                                  p.status
                                                              ].variant
                                                    }
                                                    className="absolute top-3 left-3"
                                                >
                                                    {p.accepting
                                                        ? 'Pendaftaran Dibuka'
                                                        : PROGRAM_STATUS[
                                                              p.status
                                                          ].label}
                                                </Badge>
                                            </div>
                                            <div className="grid gap-3 p-4">
                                                <span className="text-xs font-bold tracking-wide text-primary-700 uppercase">
                                                    {TYPE_LABEL[p.type]}
                                                </span>
                                                <span className="text-h3 leading-tight font-bold">
                                                    {p.title}
                                                </span>
                                                {p.speakerName && (
                                                    <span className="text-sm">
                                                        Pemateri:{' '}
                                                        {p.speakerName}
                                                    </span>
                                                )}
                                                <span className="grid gap-1 text-xs text-muted-foreground">
                                                    {when(p.startsAt) && (
                                                        <span className="flex items-center gap-1">
                                                            <CalendarDays
                                                                className="size-3.5"
                                                                aria-hidden
                                                            />{' '}
                                                            {when(p.startsAt)}
                                                        </span>
                                                    )}
                                                    {p.location && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin
                                                                className="size-3.5"
                                                                aria-hidden
                                                            />{' '}
                                                            {p.mode === 'online'
                                                                ? 'Online'
                                                                : p.location}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <Users
                                                            className="size-3.5"
                                                            aria-hidden
                                                        />{' '}
                                                        {p.registered}
                                                        {p.quota
                                                            ? ` / ${p.quota}`
                                                            : ''}{' '}
                                                        pendaftar
                                                    </span>
                                                </span>
                                                {pct !== null && (
                                                    <span className="h-1.5 bg-primary-100">
                                                        <span
                                                            className={cn(
                                                                'block h-full',
                                                                pct >= 100
                                                                    ? 'bg-danger'
                                                                    : 'bg-primary-700',
                                                            )}
                                                            style={{
                                                                width: `${pct}%`,
                                                            }}
                                                        />
                                                    </span>
                                                )}
                                                {p.myStatus && (
                                                    <Badge
                                                        variant={
                                                            REGISTRATION_STATUS[
                                                                p.myStatus
                                                            ].variant
                                                        }
                                                    >
                                                        Status Anda:{' '}
                                                        {
                                                            REGISTRATION_STATUS[
                                                                p.myStatus
                                                            ].label
                                                        }
                                                    </Badge>
                                                )}
                                            </div>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )
                ) : mine.length === 0 ? (
                    <EmptyState
                        icon={AppWindow}
                        title="Belum mendaftar program"
                        description="Daftar program dari Etalase."
                    />
                ) : (
                    <ul className="divide-y border bg-card">
                        {mine.map((m) => (
                            <li key={m.id}>
                                <Link
                                    href={ProgramController.show.url(
                                        m.programId,
                                    )}
                                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-primary-50"
                                >
                                    <span className="grid">
                                        <span className="text-xs text-muted-foreground">
                                            {m.type}
                                        </span>
                                        <span className="font-bold">
                                            {m.title}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            Mendaftar{' '}
                                            {formatRelative(m.createdAt)}
                                        </span>
                                    </span>
                                    <Badge
                                        variant={
                                            REGISTRATION_STATUS[m.status]
                                                .variant
                                        }
                                    >
                                        {REGISTRATION_STATUS[m.status].label}
                                    </Badge>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
