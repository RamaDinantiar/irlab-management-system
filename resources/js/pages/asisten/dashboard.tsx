import { Head, Link } from '@inertiajs/react';
import { ClipboardPlus, FlaskConical, Play, SquarePen } from 'lucide-react';
import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { AlertLinks } from '@/components/dashboard/alert-links';
import { GradingQueue } from '@/components/dashboard/grading-queue';
import { HighlightCard } from '@/components/dashboard/highlight-card';
import { MetricCard } from '@/components/dashboard/metric-card';
import { NextShiftCard } from '@/components/dashboard/next-shift-card';
import { WeekSchedule } from '@/components/dashboard/week-schedule';
import { DashboardGreeting } from '@/components/dashboard-greeting';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AsistenDashboard as AsistenDashboardData } from '@/types';

/**
 * Dashboard Asisten — Figma "Dashboard" + PRD FR-AD.
 * Data dari AsistenDashboardData (sementara sebagian contoh, lihat `isSample`).
 */
export default function AsistenDashboard({
    dashboard,
}: {
    dashboard: AsistenDashboardData;
}) {
    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                    <div className="space-y-3">
                        {dashboard.isSample && (
                            <Badge
                                variant="warning"
                                title="Sebagian data dashboard masih contoh sampai modulnya dibangun."
                            >
                                <FlaskConical aria-hidden /> Data contoh
                            </Badge>
                        )}
                        <DashboardGreeting />
                    </div>

                    {/* PRD FR-AD-1: action bar. "Buat Laporan Ngawas" = kartu gradient di bawah. */}
                    <div
                        role="toolbar"
                        aria-label="Aksi cepat"
                        className="flex flex-wrap gap-2"
                    >
                        <Button asChild>
                            <Link href="/asisten/class" prefetch>
                                <Play /> Mulai Sesi Kelas
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/asisten/task" prefetch>
                                <ClipboardPlus /> Buat Tugas
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/asisten/grade" prefetch>
                                <SquarePen /> Buka Grading
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <HighlightCard
                        title="Tulis Laporan Ngawas"
                        description="Segera isi riwayat kelas setelah kelas selesai."
                        href="/asisten/report"
                        badge={
                            dashboard.pendingReports > 0 && (
                                <span className="w-fit bg-white px-2 py-0.5 text-xs font-bold text-danger">
                                    {dashboard.pendingReports} laporan belum
                                    diisi
                                </span>
                            )
                        }
                    />
                    <MetricCard
                        value={dashboard.pendingGrading}
                        label="Pre/Post-Test belum dinilai"
                        href="/asisten/grade"
                    />
                    <div className="md:col-span-2 xl:col-span-1">
                        <NextShiftCard shift={dashboard.nextShift} />
                    </div>
                </div>

                <AlertLinks alerts={dashboard.alerts} />

                <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <WeekSchedule
                        weekStart={dashboard.week.start}
                        today={dashboard.week.today}
                        events={dashboard.week.events}
                    />
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                        <GradingQueue items={dashboard.gradingQueue} />
                        <ActivityFeed items={dashboard.activities} />
                    </div>
                </div>
            </div>
        </>
    );
}
