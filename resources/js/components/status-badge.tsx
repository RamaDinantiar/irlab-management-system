import {
    Archive,
    CheckCircle2,
    CircleDashed,
    CircleSlash,
    Clock,
    FileText,
    Lock,
    Send,
    Undo2,
    XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Tone = 'success' | 'warning' | 'destructive' | 'secondary' | 'outline';

/**
 * Semua status dari PRD (Bagian 3 & 5) dengan warna semantik + ikon + label,
 * karena PRD 7.2 melarang status dibedakan hanya lewat warna.
 */
const STATUSES = {
    // Submission (US-P02, FR-AG-01)
    submitted: { label: 'Terkumpul', tone: 'success', icon: CheckCircle2 },
    late: { label: 'Terlambat', tone: 'destructive', icon: Clock },
    not_submitted: {
        label: 'Belum Mengumpulkan',
        tone: 'outline',
        icon: CircleDashed,
    },

    // Nilai (US-P03, US-A02)
    graded: { label: 'Dinilai', tone: 'success', icon: CheckCircle2 },
    verified_grade: {
        label: 'Tuntas & Diverifikasi',
        tone: 'success',
        icon: CheckCircle2,
    },
    awaiting_grade: {
        label: 'Menunggu Penilaian',
        tone: 'warning',
        icon: Clock,
    },

    // Tugas (FR-AT-05) & laporan ngawas (FR-AR-05)
    draft: { label: 'Draft', tone: 'warning', icon: FileText },
    scheduled: { label: 'Terjadwal', tone: 'secondary', icon: Clock },
    open: { label: 'Terbuka', tone: 'success', icon: CheckCircle2 },
    closed: { label: 'Ditutup', tone: 'outline', icon: Lock },
    locked: { label: 'Terkunci', tone: 'outline', icon: Lock },
    report_submitted: { label: 'Diajukan', tone: 'warning', icon: Send },
    verified: { label: 'Diverifikasi', tone: 'success', icon: CheckCircle2 },
    returned: { label: 'Dikembalikan', tone: 'destructive', icon: Undo2 },

    // Semester (US-D01)
    semester_active: { label: 'Aktif', tone: 'success', icon: CheckCircle2 },
    archived: { label: 'Arsip', tone: 'outline', icon: Archive },

    // Persetujuan kelas / mata kuliah, tukar shift
    pending_approval: {
        label: 'Menunggu Persetujuan',
        tone: 'warning',
        icon: Clock,
    },
    approved: { label: 'Disetujui', tone: 'success', icon: CheckCircle2 },
    rejected: { label: 'Ditolak', tone: 'destructive', icon: XCircle },
    expired: { label: 'Kedaluwarsa', tone: 'outline', icon: CircleSlash },

    // Presensi (FR-AD-01)
    present: { label: 'Hadir', tone: 'success', icon: CheckCircle2 },
    permit: { label: 'Izin', tone: 'secondary', icon: FileText },
    sick: { label: 'Sakit', tone: 'secondary', icon: FileText },
    absent: { label: 'Alfa', tone: 'destructive', icon: XCircle },
} satisfies Record<string, { label: string; tone: Tone; icon: LucideIcon }>;

export type Status = keyof typeof STATUSES;

export function StatusBadge({
    status,
    label,
    className,
}: {
    status: Status;
    /** Ganti teks bawaan, mis. "Terlambat 2 jam". */
    label?: string;
    className?: string;
}) {
    const { label: defaultLabel, tone, icon: Icon } = STATUSES[status];

    return (
        <Badge variant={tone} className={className}>
            <Icon aria-hidden />
            {label ?? defaultLabel}
        </Badge>
    );
}
