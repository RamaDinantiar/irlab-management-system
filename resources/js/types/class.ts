/** Kelas — sama dengan app/Http/Resources/LabClassResource.php. */
export type ClassRow = {
    id: number;
    semesterId: number;
    course?: { id: number; code: string; name: string };
    name: string;
    /** 1 = Senin … 7 = Minggu. */
    dayOfWeek: number;
    /** "HH:MM". */
    startTime: string;
    endTime: string;
    room?: { id: number; name: string };
    quota: number;
    membersCount: number;
    /** null sampai kelas disetujui Admin. */
    joinToken: string | null;
    isLocked: boolean;
    assistants?: { id: number; name: string }[];
    approvalStatus: 'pending' | 'approved' | 'rejected';
    proposedBy?: string | null;
    proposedAt: string | null;
    rejectionReason: string | null;
    canEdit: boolean;
};

/** Pilihan <Select>. */
export type SelectOption = { id: number; label: string };

export type RoomRow = {
    id: number;
    name: string;
    rows: number;
    cols: number;
    classesCount: number;
    seatsCount: number;
};
