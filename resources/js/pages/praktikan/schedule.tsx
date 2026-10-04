import { Head } from '@inertiajs/react';
import { CalendarDays, Download, List, Lock } from 'lucide-react';
import { useState } from 'react';
import { WeekSchedule } from '@/components/dashboard/week-schedule';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDate, formatRelative } from '@/lib/datetime';
import { formatSchedule } from '@/lib/days';
import { formatFileSize } from '@/lib/files';
import { scheduleColors } from '@/lib/schedule-colors';
import { cn } from '@/lib/utils';
import type { AsistenDashboard, FileLink, ScheduleColor } from '@/types';

type ScheduleClass = {
    id: number;
    course: string;
    name: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room: string;
    color: ScheduleColor;
    meetings: {
        id: number;
        number: number;
        date: string;
        moduleTitle: string | null;
        assistant: string;
        module: FileLink | null;
        moduleReleaseAt: string | null;
    }[];
};

/** Praktikan › Schedule (FR-PS-01…03): "Minggu" & "Daftar Pertemuan"; mobile default daftar. */
export default function PraktikanSchedule({
    week,
    classes,
}: {
    week: AsistenDashboard['week'];
    classes: ScheduleClass[];
}) {
    const isMobile = useIsMobile();
    const [view, setView] = useState<'week' | 'list' | null>(null);
    const current = view ?? (isMobile ? 'list' : 'week');

    return (
        <>
            <Head title="Schedule" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Schedule"
                    description="Jadwal kelas praktikum yang Anda ikuti, pertemuan, dan modul yang sudah dirilis."
                    actions={
                        <div
                            role="group"
                            aria-label="Tampilan"
                            className="flex"
                        >
                            <Button
                                variant={
                                    current === 'week' ? 'default' : 'outline'
                                }
                                onClick={() => setView('week')}
                                aria-pressed={current === 'week'}
                            >
                                <CalendarDays /> Minggu
                            </Button>
                            <Button
                                variant={
                                    current === 'list' ? 'default' : 'outline'
                                }
                                onClick={() => setView('list')}
                                aria-pressed={current === 'list'}
                            >
                                <List /> Daftar Pertemuan
                            </Button>
                        </div>
                    }
                />

                {classes.length === 0 ? (
                    <EmptyState
                        icon={CalendarDays}
                        title="Belum ada kelas"
                        description="Gabung kelas dengan kode dari asisten untuk melihat jadwal."
                    />
                ) : current === 'week' ? (
                    <WeekSchedule
                        weekStart={week.start}
                        today={week.today}
                        events={week.events}
                    />
                ) : (
                    <div className="grid gap-6">
                        {classes.map((klass) => (
                            <section
                                key={klass.id}
                                aria-labelledby={`class-${klass.id}`}
                                className={cn(
                                    'border-l-4 bg-card',
                                    scheduleColors[klass.color].accent,
                                )}
                            >
                                <header className="border-b px-5 py-4">
                                    <h2
                                        id={`class-${klass.id}`}
                                        className="text-h3 font-bold text-primary-700"
                                    >
                                        {klass.course} · {klass.name}
                                    </h2>
                                    <p className="font-mono text-sm">
                                        {formatSchedule(
                                            klass.dayOfWeek,
                                            klass.startTime,
                                            klass.endTime,
                                        )}{' '}
                                        · {klass.room}
                                    </p>
                                </header>
                                {klass.meetings.length === 0 ? (
                                    <p className="px-5 py-4 text-sm text-muted-foreground">
                                        Asisten belum menyusun pertemuan.
                                    </p>
                                ) : (
                                    <ol className="divide-y divide-primary-50">
                                        {klass.meetings.map((meeting) => (
                                            <li
                                                key={meeting.id}
                                                className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div>
                                                    <p className="font-bold">
                                                        <span className="font-mono">
                                                            P
                                                            {String(
                                                                meeting.number,
                                                            ).padStart(2, '0')}
                                                        </span>{' '}
                                                        ·{' '}
                                                        {meeting.moduleTitle ??
                                                            'Modul belum ditentukan'}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {formatDate(
                                                            meeting.date,
                                                        )}{' '}
                                                        · {meeting.assistant}
                                                    </p>
                                                </div>
                                                {meeting.module ? (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        asChild
                                                    >
                                                        <a
                                                            href={
                                                                meeting.module
                                                                    .url
                                                            }
                                                            download
                                                        >
                                                            <Download /> Modul (
                                                            {formatFileSize(
                                                                meeting.module
                                                                    .size,
                                                            )}
                                                            )
                                                        </a>
                                                    </Button>
                                                ) : meeting.moduleReleaseAt ? (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Lock
                                                            className="size-3.5"
                                                            aria-hidden
                                                        />{' '}
                                                        Modul dirilis{' '}
                                                        {formatRelative(
                                                            meeting.moduleReleaseAt,
                                                        )}
                                                    </span>
                                                ) : null}
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </section>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
