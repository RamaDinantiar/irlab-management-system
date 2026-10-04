/** Baris tabel Admin › Semester — sama dengan SemesterController@index. */
export type SemesterRow = {
    id: number;
    name: string;
    /** "YYYY-MM-DD". */
    startDate: string;
    endDate: string;
    status: 'draft' | 'active' | 'archived';
    activatedAt: string | null;
    archivedAt: string | null;
    canEdit: boolean;
    canPurge: boolean;
};
