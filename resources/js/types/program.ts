/** Kontrak data Program — Asisten\ProgramController, Praktikan\ProgramController. */

export type ProgramTypeValue =
    | 'workshop'
    | 'quick_tutor'
    | 'recruitment'
    | 'maintenance';
export type ProgramStatus = 'draft' | 'open' | 'closed' | 'finished';
export type RegistrationStatus =
    | 'registered'
    | 'passed_docs'
    | 'testing'
    | 'accepted'
    | 'rejected'
    | 'cancelled';

export type ProgramTypeInfo = {
    value: ProgramTypeValue;
    slug: string;
    label: string;
};

export type ProgramCard = {
    id: number;
    type: ProgramTypeValue;
    typeSlug: string;
    title: string;
    category: string | null;
    speakerName: string | null;
    speakerAffiliation: string | null;
    mode: 'offline' | 'online';
    location: string | null;
    startsAt: string | null;
    endsAt: string | null;
    quota: number | null;
    registered: number;
    feeInternal: number | null;
    feeExternal: number | null;
    status: ProgramStatus;
    accepting: boolean;
    opensAt: string | null;
    closesAt: string | null;
    poster: string | null;
    description: string | null;
    resultNotes: string | null;
    staffIds: number[];
    roomId: number | null;
    facilities: string[];
    staff?: string[];
    myStatus?: RegistrationStatus | null;
};

export type ProgramField = {
    id?: number;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'select' | 'file';
    required: boolean;
    options: string[];
    formats: string[];
    maxMb: number;
};

export type ProgramStageRow = {
    id?: number;
    name: string;
    startAt: string | null;
    endAt: string | null;
};

export type ProgramOptions = {
    assistants: { id: number; name: string }[];
    rooms: { id: number; name: string }[];
};

export const PROGRAM_STATUS: Record<
    ProgramStatus,
    { label: string; variant: 'success' | 'warning' | 'muted' | 'secondary' }
> = {
    draft: { label: 'Persiapan', variant: 'secondary' },
    open: { label: 'Pendaftaran Dibuka', variant: 'success' },
    closed: { label: 'Pendaftaran Ditutup', variant: 'warning' },
    finished: { label: 'Selesai', variant: 'muted' },
};

export const REGISTRATION_STATUS: Record<
    RegistrationStatus,
    {
        label: string;
        variant: 'success' | 'warning' | 'destructive' | 'muted' | 'secondary';
    }
> = {
    registered: { label: 'Terdaftar', variant: 'secondary' },
    passed_docs: { label: 'Lolos Berkas', variant: 'success' },
    testing: { label: 'Tes', variant: 'warning' },
    accepted: { label: 'Diterima', variant: 'success' },
    rejected: { label: 'Ditolak', variant: 'destructive' },
    cancelled: { label: 'Dibatalkan', variant: 'muted' },
};
