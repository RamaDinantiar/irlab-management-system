import type { ScheduleColor } from './dashboard';

/** Mata Kuliah — sama dengan app/Http/Resources/CourseResource.php. */
export type CourseRow = {
    id: number;
    semesterId: number;
    code: string;
    name: string;
    color: ScheduleColor;
    credits: number;
    weights: { pretest: number; posttest: number; report: number };
    /** Hanya ada bila relasi dimuat. */
    assistants?: { id: number; name: string }[];
    approvalStatus: 'pending' | 'approved' | 'rejected';
    proposedBy?: string | null;
    proposedAt: string | null;
    rejectionReason: string | null;
    canEdit: boolean;
};

export type AssistantOption = {
    id: number;
    name: string;
    nim: string | null;
};

export type SemesterOption = {
    id: number;
    name: string;
    status: 'draft' | 'active' | 'archived';
};
