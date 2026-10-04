import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import { formatDateRange } from '@/lib/datetime';
import type { AdminDashboard } from '@/types';

/** FR-ADM-01: semester aktif — gaya kartu gradient Figma. */
export function SemesterCard({
    semester,
}: {
    semester: AdminDashboard['semester'];
}) {
    return (
        <Link
            href="/admin/semesters"
            prefetch
            className="group relative flex min-h-36 flex-col justify-end gap-1.5 bg-linear-to-r from-primary-900 to-primary p-5 text-white transition-shadow hover:shadow-lg focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
            <span className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full ring-2 ring-white/90 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                <ArrowUpRight className="size-5" aria-hidden />
            </span>
            <span className="font-mono text-xs font-bold uppercase">
                Semester Aktif
            </span>
            {semester ? (
                <>
                    <span className="text-h3 font-bold">{semester.name}</span>
                    <span className="font-mono text-sm">
                        {formatDateRange(semester.startsOn, semester.endsOn)}
                    </span>
                    <span className="mt-1 flex items-center gap-3">
                        <span
                            role="progressbar"
                            aria-label="Progres semester"
                            aria-valuemin={1}
                            aria-valuemax={semester.totalWeeks}
                            aria-valuenow={semester.week}
                            className="h-1.5 flex-1 bg-white/25"
                        >
                            <span
                                className="block h-full bg-white"
                                style={{
                                    width: `${(semester.week / semester.totalWeeks) * 100}%`,
                                }}
                            />
                        </span>
                        <span className="shrink-0 font-mono text-xs font-bold">
                            Minggu {semester.week}/{semester.totalWeeks}
                        </span>
                    </span>
                </>
            ) : (
                <>
                    <span className="text-h3 font-bold">
                        Belum ada semester aktif
                    </span>
                    <span className="font-mono text-sm">
                        Buat & aktifkan semester baru.
                    </span>
                </>
            )}
        </Link>
    );
}
