import { Head, usePoll } from '@inertiajs/react';
import { FlaskConical } from 'lucide-react';
import { JoinClassDialog } from '@/components/classes/join-class-dialog';
import { AnnouncementList } from '@/components/dashboard/announcement-list';
import { CourseProgressList } from '@/components/dashboard/course-progress';
import { GettingStarted } from '@/components/dashboard/getting-started';
import { LiveSessionStudent } from '@/components/dashboard/live-session-student';
import { MetricCard } from '@/components/dashboard/metric-card';
import { NextClassCard } from '@/components/dashboard/next-class-card';
import { OpenProgramCard } from '@/components/dashboard/open-program-card';
import { RecentFeedback } from '@/components/dashboard/recent-feedback';
import { UpcomingTasks } from '@/components/dashboard/upcoming-tasks';
import { WeekSchedule } from '@/components/dashboard/week-schedule';
import { DashboardGreeting } from '@/components/dashboard-greeting';
import { Badge } from '@/components/ui/badge';
import type {
    PraktikanDashboard as PraktikanDashboardData,
    PraktikanLiveSession,
} from '@/types';

/**
 * Dashboard Praktikan — gaya visual Figma "Dashboard - Praktikan", isi PRD FR-PD
 * (frame Figma masih memuat kartu milik Asisten & catatan desainer).
 */
export default function PraktikanDashboard({
    dashboard,
    liveSessions,
}: {
    dashboard: PraktikanDashboardData;
    liveSessions: PraktikanLiveSession[];
}) {
    // Test yang baru dibuka asisten & sesi yang baru mulai muncul tanpa reload.
    usePoll(20_000, { only: ['liveSessions'] });

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                {/* FR-PD-1: kartu sapaan + "Gabung Kelas" (selalu terlihat). */}
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-3">
                        {dashboard.isSample && (
                            <Badge
                                variant="warning"
                                title="Sebagian data dashboard masih contoh sampai fiturnya dibangun."
                            >
                                <FlaskConical aria-hidden /> Data contoh
                            </Badge>
                        )}
                        <DashboardGreeting />
                    </div>
                    <JoinClassDialog />
                </div>

                {liveSessions.map((session) => (
                    <LiveSessionStudent
                        key={session.meetingId}
                        session={session}
                    />
                ))}

                {dashboard.hasClasses ? (
                    <>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <NextClassCard nextClass={dashboard.nextClass} />
                            <MetricCard
                                value={dashboard.pendingTasks}
                                label="Tugas belum dikumpulkan"
                                href="/praktikan/task"
                            />
                            <div className="md:col-span-2 xl:col-span-1">
                                <OpenProgramCard
                                    program={dashboard.openProgram}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                            <WeekSchedule
                                weekStart={dashboard.week.start}
                                today={dashboard.week.today}
                                events={dashboard.week.events}
                            />
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
                                <UpcomingTasks
                                    tasks={dashboard.upcomingTasks}
                                />
                                <CourseProgressList
                                    items={dashboard.courseProgress}
                                />
                            </div>
                        </div>

                        {/* Selebar halaman agar tidak menyisakan ruang kosong di bawah kolom kanan. */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <RecentFeedback items={dashboard.recentFeedback} />
                            <AnnouncementList items={dashboard.announcements} />
                        </div>
                    </>
                ) : (
                    <>
                        <GettingStarted />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <AnnouncementList items={dashboard.announcements} />
                            <OpenProgramCard program={dashboard.openProgram} />
                        </div>
                    </>
                )}
            </div>
        </>
    );
}
