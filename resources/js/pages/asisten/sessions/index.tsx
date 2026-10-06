import { Head, Link } from '@inertiajs/react';
import { CalendarClock, MapPin, Play } from 'lucide-react';
import SessionController from '@/actions/App/Http/Controllers/Asisten/SessionController';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/datetime';

type Session = {
    id: number;
    number: number;
    date: string;
    isToday: boolean;
    startedAt: string | null;
    endedAt: string | null;
    running: boolean;
    moduleTitle: string | null;
    class: {
        id: number;
        name: string;
        course: string;
        startTime: string;
        endTime: string;
        room: string;
    };
};

/** FR-AD-01: pilih sesi hari ini / mendatang untuk dimulai. */
export default function SessionsIndex({ sessions }: { sessions: Session[] }) {
    return (
        <>
            <Head title="Mulai Sesi Kelas" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Mulai Sesi Kelas"
                    description="Pilih sesi untuk menandai pertemuan dimulai, membuka Pre-test terjadwal, dan mengisi presensi."
                />
                {sessions.length === 0 ? (
                    <EmptyState
                        icon={CalendarClock}
                        title="Tidak ada sesi dalam 7 hari ke depan"
                        description="Buat pertemuan di tab Pertemuan & Modul pada kelas yang Anda ampu."
                    />
                ) : (
                    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {sessions.map((session) => (
                            <li
                                key={session.id}
                                className="flex flex-col gap-3 border bg-card p-5"
                            >
                                <div className="flex flex-wrap items-center gap-2">
                                    {session.isToday && <Badge>Hari ini</Badge>}
                                    {session.running ? (
                                        <Badge variant="success">
                                            Sedang berjalan
                                        </Badge>
                                    ) : session.startedAt ? (
                                        <Badge variant="secondary">
                                            {session.endedAt
                                                ? 'Selesai'
                                                : 'Sudah dimulai'}
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline">
                                            Belum dimulai
                                        </Badge>
                                    )}
                                </div>
                                <div>
                                    <p className="text-h3 font-bold text-primary-700">
                                        {session.class.course}
                                    </p>
                                    <p className="font-bold">
                                        {session.class.name} · Pertemuan{' '}
                                        {session.number}
                                    </p>
                                    {session.moduleTitle && (
                                        <p className="text-sm">
                                            {session.moduleTitle}
                                        </p>
                                    )}
                                </div>
                                <p className="font-mono text-sm">
                                    {formatDate(session.date)} ·{' '}
                                    {session.class.startTime.replace(':', '.')}–
                                    {session.class.endTime.replace(':', '.')}
                                </p>
                                <p className="flex items-center gap-1.5 text-sm">
                                    <MapPin
                                        className="size-4 text-primary-700"
                                        aria-hidden
                                    />{' '}
                                    {session.class.room}
                                </p>
                                <Button className="mt-auto w-fit" asChild>
                                    <Link
                                        href={SessionController.show.url(
                                            session.id,
                                        )}
                                    >
                                        <Play />{' '}
                                        {session.startedAt
                                            ? 'Buka Sesi'
                                            : 'Mulai Sesi'}
                                    </Link>
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
