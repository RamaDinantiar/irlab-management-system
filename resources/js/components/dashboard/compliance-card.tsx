import { Link } from '@inertiajs/react';
import { StatusBadge } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import type { AdminDashboard } from '@/types';

/**
 * FR-ADM-01: kepatuhan laporan ngawas bulan ini. KPI PRD Bagian 1: laporan
 * tercatat di hari yang sama dengan shift ≥ target (90%).
 */
export function ComplianceCard({
    compliance,
}: {
    compliance: AdminDashboard['reportCompliance'];
}) {
    const percent =
        compliance.expected > 0
            ? Math.round((compliance.onTime / compliance.expected) * 100)
            : 100;
    const missing = compliance.expected - compliance.submitted;
    const meetsTarget = percent >= compliance.target;

    return (
        <Link
            href="/admin/report"
            prefetch
            className="flex min-h-36 flex-col gap-1 border bg-card p-5 transition-shadow hover:shadow-md focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
            <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-primary-700">
                    Kepatuhan Laporan Ngawas · {compliance.month}
                </span>
                {meetsTarget ? (
                    <Badge variant="success">
                        Memenuhi target {compliance.target}%
                    </Badge>
                ) : (
                    <Badge variant="warning">
                        Di bawah target {compliance.target}%
                    </Badge>
                )}
            </span>
            <span className="mt-auto text-[3rem] leading-none font-bold text-primary">
                {percent}%
            </span>
            <span className="text-sm">
                {compliance.onTime} dari {compliance.expected} shift dilaporkan
                di hari yang sama
            </span>
            {missing > 0 && (
                <StatusBadge
                    status="not_submitted"
                    label={`${missing} laporan belum diisi`}
                />
            )}
        </Link>
    );
}
