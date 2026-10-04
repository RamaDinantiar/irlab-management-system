import { Head } from '@inertiajs/react';
import { MapPin, UserRound, Users } from 'lucide-react';
import { JoinClassDialog } from '@/components/classes/join-class-dialog';
import { GettingStarted } from '@/components/dashboard/getting-started';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { formatSchedule } from '@/lib/days';

type EnrolledClass = {
    id: number;
    course: { code: string; name: string };
    name: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    room: string;
    assistants: string[];
    membersCount: number;
    quota: number;
};

/** Praktikan › Class: kelas yang diikuti + Gabung Kelas (US-P01). */
export default function PraktikanClassIndex({
    semester,
    classes,
}: {
    semester: { id: number; name: string } | null;
    classes: EnrolledClass[];
}) {
    return (
        <>
            <Head title="Class" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Class"
                    description={
                        semester
                            ? `Kelas praktikum yang Anda ikuti pada ${semester.name}.`
                            : 'Belum ada semester aktif.'
                    }
                    actions={classes.length > 0 && <JoinClassDialog />}
                />

                {classes.length === 0 ? (
                    <GettingStarted />
                ) : (
                    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {classes.map((klass) => (
                            <li
                                key={klass.id}
                                className="flex flex-col gap-3 border bg-card p-5"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <Badge>{klass.course.code}</Badge>
                                    <span className="flex items-center gap-1 font-mono text-xs">
                                        <Users
                                            className="size-3.5"
                                            aria-hidden
                                        />
                                        {klass.membersCount}/{klass.quota}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-h3 font-bold text-primary-700">
                                        {klass.course.name}
                                    </p>
                                    <p className="font-bold">{klass.name}</p>
                                </div>
                                <p className="font-mono text-sm">
                                    {formatSchedule(
                                        klass.dayOfWeek,
                                        klass.startTime,
                                        klass.endTime,
                                    )}
                                </p>
                                <div className="mt-auto space-y-1 border-t pt-3 text-sm">
                                    <p className="flex items-center gap-1.5">
                                        <MapPin
                                            className="size-4 text-primary-700"
                                            aria-hidden
                                        />
                                        {klass.room}
                                    </p>
                                    <p className="flex items-center gap-1.5">
                                        <UserRound
                                            className="size-4 text-primary-700"
                                            aria-hidden
                                        />
                                        {klass.assistants.join(', ') ||
                                            'Asisten belum ditetapkan'}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
