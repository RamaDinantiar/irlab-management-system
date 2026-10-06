import type { JSONContent } from '@tiptap/react';
import type { FileLink } from './meeting';

export type TaskType = 'pretest' | 'posttest' | 'report';

/** FR-AT-05: status per kelas. */
export type TaskState = 'draft' | 'scheduled' | 'open' | 'closed';

export type TaskFormOptions = {
    courses: {
        id: number;
        label: string;
        classes: {
            id: number;
            label: string;
            dayOfWeek: number;
            startTime: string;
            endTime: string;
            members: number;
        }[];
    }[];
    limits: { attachments: number; attachmentMb: number };
};

export type TaskFormData = {
    id: number;
    type: TaskType;
    courseId: number;
    title: string;
    topic: string | null;
    body: JSONContent | null;
    meetingNumber: number | null;
    maxScore: number;
    allowLate: boolean;
    latePenalty: number | null;
    latePenaltyUnit: 'hour' | 'day' | null;
    allowedFormats: ('pdf' | 'zip')[];
    textAnswer: 'none' | 'optional' | 'required';
    status: 'draft' | 'published';
    canEdit: boolean;
    attachments: FileLink[];
    targets: {
        classId: number;
        openAt: string | null;
        dueAt: string | null;
        windowMinutes: number | null;
    }[];
};

/** Tugas di sisi Praktikan (Praktikan\TaskController::summary). */
export type StudentTask = {
    id: number;
    type: TaskType;
    title: string;
    course: string;
    className: string;
    openAt: string | null;
    dueAt: string | null;
    state: TaskState;
    status: 'not_submitted' | 'submitted' | 'late';
    submittedAt: string | null;
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
    pretest: 'Pre-Test',
    posttest: 'Post-Test',
    report: 'Laporan Praktikum',
};

export const TASK_TYPE_SLUG: Record<TaskType, string> = {
    pretest: 'pre-test',
    posttest: 'post-test',
    report: 'laporan',
};
