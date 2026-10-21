import { Head, Link } from '@inertiajs/react';
import { CalendarRange, FlaskConical, Megaphone, Upload } from 'lucide-react';
import { ActivePrograms } from '@/components/dashboard/active-programs';
import { ApprovalQueue } from '@/components/dashboard/approval-queue';
import { AuditLogFeed } from '@/components/dashboard/audit-log-feed';
import { ComplianceCard } from '@/components/dashboard/compliance-card';
import { GradingQueue } from '@/components/dashboard/grading-queue';
import { MetricCard } from '@/components/dashboard/metric-card';
import { SemesterCard } from '@/components/dashboard/semester-card';
import { DashboardGreeting } from '@/components/dashboard-greeting';
import { StatCard } from '@/components/stat-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { AdminDashboard as AdminDashboardData } from '@/types';

/**
 * Dashboard Admin — PRD FR-ADM-01. Belum ada desain Figma; gaya mengikuti
 * dashboard Asisten & Praktikan (kartu gradient, kartu angka, panel).
 */
export default function AdminDashboard({
    dashboard,
}: {
    dashboard: AdminDashboardData;
}) {
    const { counts } = dashboard;

    return (
        <>
            <Head title="Dashboard" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
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
                    <div
                        role="toolbar"
                        aria-label="Aksi cepat"
                        className="flex flex-wrap gap-2"
                    >
                        <Button asChild>
                            <Link href="/admin/semesters" prefetch>
                                <CalendarRange /> Kelola Semester
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/admin/users" prefetch>
                                <Upload /> Import Pengguna
                            </Link>
                        </Button>
                        <Button variant="outline" asChild>
                            <Link href="/admin/announcements" prefetch>
                                <Megaphone /> Buat Pengumuman
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <SemesterCard semester={dashboard.semester} />
                    <MetricCard
                        value={dashboard.approvals.length}
                        label="Pengajuan menunggu persetujuan"
                        href="/admin/courses"
                    />
                    <div className="md:col-span-2 xl:col-span-1">
                        <ComplianceCard
                            compliance={dashboard.reportCompliance}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatCard
                        label="Praktikan aktif"
                        value={counts.praktikan}
                    />
                    <StatCard label="Asisten lab" value={counts.asisten} />
                    <StatCard
                        label="Kelas semester ini"
                        value={counts.classes}
                    />
                    <StatCard label="Mata kuliah" value={counts.courses} />
                </div>

                <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="grid min-w-0 grid-cols-1 gap-4">
                        <ApprovalQueue items={dashboard.approvals} />
                        <AuditLogFeed items={dashboard.auditLogs} />
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
                        <GradingQueue
                            items={dashboard.gradingQueue}
                            gradeHref="/admin/grade"
                        />
                        <ActivePrograms items={dashboard.activePrograms} />
                    </div>
                </div>
            </div>
        </>
    );
}
