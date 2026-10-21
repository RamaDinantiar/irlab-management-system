import { Head } from '@inertiajs/react';
import { CalendarDays, List } from 'lucide-react';
import { useState } from 'react';
import { WeekSchedule } from '@/components/dashboard/week-schedule';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { ClassesByDay } from '@/components/schedule/classes-by-day';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/datetime';
import { formatSchedule } from '@/lib/days';
import { scheduleColors } from '@/lib/schedule-colors';
import { cn } from '@/lib/utils';
import type { AllClassRow, AsistenDashboard, ScheduleColor } from '@/types';

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
        topic: string | null;
        assistant: string;
    }[];
};

/**
 * Praktikan › Schedule (FR-PS-01…03): "Jadwal Saya" (kalender mingguan +
 * daftar pertemuan) dan "Semua Jadwal di Lab" (seluruh kelas per hari).
 */
export default function PraktikanSchedule({
    week,
    classes,
    allClasses,
}: {
    week: AsistenDashboard['week'];
    classes: ScheduleClass[];
    allClasses: AllClassRow[];
}) {
    const [current, setView] = useState<'mine' | 'all'>('mine');

    return (
        <>
            <Head title="Schedule" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Schedule"
                    description={
                        current === 'all'
                            ? 'Seluruh kelas praktikum di laboratorium semester ini. Kelas yang Anda ikuti diberi bingkai.'
                            : 'Jadwal kelas praktikum yang Anda ikuti beserta daftar pertemuannya.'
                    }
                    actions={
                        <div
                            role="group"
                            aria-label="Tampilan"
                            className="flex"
                        >
                            <Button
                                variant={
                                    current === 'mine' ? 'default' : 'outline'
                                }
                                onClick={() => setView('mine')}
                                aria-pressed={current === 'mine'}
                            >
                                <CalendarDays /> Jadwal Saya
                            </Button>
                            <Button
                                variant={
                                    current === 'all' ? 'default' : 'outline'
                                }
                                onClick={() => setView('all')}
                                aria-pressed={current === 'all'}
                            >
                                <List /> Semua Jadwal di Lab
                            </Button>
                        </div>
                    }
                />

                {current === 'all' ? (
                    allClasses.length === 0 ? (
                        <EmptyState
                            icon={CalendarDays}
                            title="Belum ada jadwal"
                            description="Belum ada kelas aktif di lab pada semester ini."
                        />
                    ) : (
                        <ClassesByDay rows={allClasses} />
                    )
                ) : classes.length === 0 ? (
                    <EmptyState
                        icon={CalendarDays}
                        title="Belum ada kelas"
                        description="Gabung kelas dengan kode dari asisten untuk melihat jadwal."
                    />
                ) : (
                    <>
                        <WeekSchedule
                            weekStart={week.start}
                            today={week.today}
                            events={week.events}
                        />
                        <h2 className="text-h3 font-bold text-primary-700">
                            Pertemuan
                        </h2>
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
                                                    className="px-5 py-3"
                                                >
                                                    <div>
                                                        <p className="font-bold">
                                                            <span className="font-mono">
                                                                P
                                                                {String(
                                                                    meeting.number,
                                                                ).padStart(
                                                                    2,
                                                                    '0',
                                                                )}
                                                            </span>{' '}
                                                            ·{' '}
                                                            {meeting.topic ??
                                                                'Materi belum ditentukan'}
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            {formatDate(
                                                                meeting.date,
                                                            )}{' '}
                                                            ·{' '}
                                                            {meeting.assistant}
                                                        </p>
                                                    </div>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </section>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
