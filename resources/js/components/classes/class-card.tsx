import { Link } from '@inertiajs/react';
import {
    Check,
    Clock,
    Copy,
    KeyRound,
    MessageSquareWarning,
    Pencil,
    UserRound,
} from 'lucide-react';
import ClassAccessController from '@/actions/App/Http/Controllers/Asisten/ClassAccessController';
import ClassDetailController from '@/actions/App/Http/Controllers/Asisten/ClassDetailController';
import ClassProposalController from '@/actions/App/Http/Controllers/Asisten/ClassProposalController';
import {
    EnrollmentSwitch,
    RegenerateTokenButton,
} from '@/components/classes/class-access';
import { ClassFormDialog } from '@/components/classes/class-form-dialog';
import type { Status } from '@/components/status-badge';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/hooks/use-clipboard';
import { formatSchedule } from '@/lib/days';
import { cn } from '@/lib/utils';
import type { ClassRow, SelectOption } from '@/types';

const PENDING_STATUS: Record<'pending' | 'rejected', Status> = {
    pending: 'pending_approval',
    rejected: 'rejected',
};

/** Kartu kelas Asisten › Class — Figma "Class" (tanpa QR code). */
export function ClassCard({
    klass,
    options,
}: {
    klass: ClassRow;
    options: { courses: SelectOption[]; rooms: SelectOption[] };
}) {
    const [copied, copy] = useClipboard();
    const approved = klass.approvalStatus === 'approved';
    const left = Math.max(0, klass.quota - klass.membersCount);
    const filled =
        klass.quota > 0
            ? Math.min(100, (klass.membersCount / klass.quota) * 100)
            : 0;

    return (
        <li className="flex flex-col gap-5 border bg-card p-5 shadow-sm md:p-6">
            <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    <span className="bg-primary-500 px-2 py-1 font-mono text-xs text-white">
                        {klass.course?.code}
                    </span>
                    {klass.course && (
                        <span className="bg-primary-50 px-2 py-1 text-xs font-medium">
                            {klass.course.credits} SKS
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    {approved ? (
                        <span
                            className={cn(
                                'px-3 py-1 text-xs font-medium whitespace-nowrap',
                                klass.isLocked
                                    ? 'bg-muted text-muted-foreground'
                                    : 'bg-primary-700 text-white',
                            )}
                        >
                            Pendaftaran {klass.isLocked ? 'Tutup' : 'Buka'}
                        </span>
                    ) : (
                        <StatusBadge
                            status={
                                PENDING_STATUS[
                                    klass.approvalStatus as
                                        | 'pending'
                                        | 'rejected'
                                ]
                            }
                        />
                    )}
                    {klass.canEdit && (
                        <ClassFormDialog
                            action={ClassProposalController.update.form(
                                klass.id,
                            )}
                            title={`Ubah jadwal ${klass.name}`}
                            description={
                                approved
                                    ? 'Kelas sudah aktif: perubahan jadwal tidak memerlukan persetujuan ulang.'
                                    : 'Revisi dikirim ulang ke Admin.'
                            }
                            submitLabel="Simpan"
                            klass={klass}
                            courses={options.courses}
                            rooms={options.rooms}
                            trigger={
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-8"
                                    aria-label={`Ubah jadwal ${klass.course?.name} ${klass.name}`}
                                    title="Ubah jadwal"
                                >
                                    <Pencil />
                                </Button>
                            }
                        />
                    )}
                </div>
            </div>

            <div>
                <h3 className="text-h2 font-bold">{klass.course?.name}</h3>
                <p className="mt-1 font-medium text-primary-700">
                    {klass.name}
                    {klass.room && ` · ${klass.room.name}`}
                </p>
            </div>

            <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex gap-3">
                    <Clock
                        className="mt-0.5 size-6 shrink-0 text-primary-500"
                        aria-hidden
                    />
                    <div>
                        <dt className="font-bold">Jadwal:</dt>
                        <dd>
                            {formatSchedule(
                                klass.dayOfWeek,
                                klass.startTime,
                                klass.endTime,
                            )}{' '}
                            WIB
                        </dd>
                    </div>
                </div>
                <div className="flex gap-3">
                    <UserRound
                        className="mt-0.5 size-6 shrink-0 text-primary-500"
                        aria-hidden
                    />
                    <div>
                        <dt className="font-bold">Dosen:</dt>
                        <dd>{klass.lecturer ?? 'Belum diisi'}</dd>
                    </div>
                </div>
            </dl>

            <div className="grid gap-2">
                <p className="text-sm">Asisten Jaga:</p>
                {klass.assistants && klass.assistants.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                        {klass.assistants.map((assistant) => (
                            <li
                                key={assistant.id}
                                className="bg-primary-50 px-4 py-1.5 text-sm"
                            >
                                {assistant.name}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Belum ditetapkan.
                    </p>
                )}
            </div>

            {klass.rejectionReason && (
                <p className="flex gap-2 border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
                    <MessageSquareWarning
                        className="mt-0.5 size-4 shrink-0"
                        aria-hidden
                    />
                    <span>
                        <strong>Alasan penolakan:</strong>{' '}
                        {klass.rejectionReason}
                    </span>
                </p>
            )}

            {klass.joinToken ? (
                <div className="flex flex-wrap items-center gap-4 border border-primary-200 bg-primary-50 px-4 py-3">
                    <KeyRound
                        className="size-8 shrink-0 text-primary-500"
                        aria-hidden
                    />
                    {/* min-w-40: di kartu sempit tombol turun ke baris baru, kode tidak terjepit. */}
                    <div className="min-w-40 flex-1">
                        <p className="text-xs tracking-wide text-muted-foreground uppercase">
                            Enrollment Code / Key
                        </p>
                        <p className="font-mono text-2xl font-bold tracking-[0.15em]">
                            {klass.joinToken}
                        </p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="outline"
                            className="bg-white"
                            onClick={() => void copy(klass.joinToken ?? '')}
                        >
                            {copied === klass.joinToken ? (
                                <Check className="text-success" />
                            ) : (
                                <Copy />
                            )}
                            {copied === klass.joinToken
                                ? 'Tersalin'
                                : 'Salin Kode'}
                        </Button>
                        {klass.canEdit && (
                            <RegenerateTokenButton
                                klass={klass}
                                action={ClassAccessController.regenerateToken.form(
                                    klass.id,
                                )}
                                className="size-9"
                            />
                        )}
                    </div>
                </div>
            ) : (
                <p className="border border-dashed px-4 py-3 text-sm text-muted-foreground">
                    Enrollment code dibuat setelah kelas disetujui Admin.
                </p>
            )}

            <div className="grid gap-2">
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                    <span>Praktikan Bergabung</span>
                    <span>
                        <strong>
                            {klass.membersCount} / {klass.quota} Mahasiswa
                        </strong>{' '}
                        <span className="text-primary-500">
                            (Sisa {left} Kursi)
                        </span>
                    </span>
                </p>
                <div
                    role="progressbar"
                    aria-label="Kursi terisi"
                    aria-valuenow={klass.membersCount}
                    aria-valuemin={0}
                    aria-valuemax={klass.quota}
                    className="h-1.5 bg-primary-100"
                >
                    <div
                        className="h-full bg-primary-700"
                        style={{ width: `${filled}%` }}
                    />
                </div>
            </div>

            {approved && (
                <div className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-2">
                    <EnrollmentSwitch
                        klass={klass}
                        action={ClassAccessController.lock.form(klass.id)}
                    />
                    <Button asChild className="px-8">
                        <Link
                            href={ClassDetailController.members.url(klass.id)}
                            prefetch
                        >
                            Detail Kelas
                        </Link>
                    </Button>
                </div>
            )}
        </li>
    );
}
