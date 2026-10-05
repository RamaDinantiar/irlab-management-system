/** Kontrak data pengumuman & notifikasi — AnnouncementData, NotificationController. */

export type AnnouncementRow = {
    id: number;
    scope: 'global' | 'class';
    classId: number | null;
    className: string | null;
    title: string;
    body: string;
    pinned: boolean;
    targetRoles: ('praktikan' | 'asisten' | 'admin')[];
    publishAt: string;
    expireAt: string | null;
    status: 'scheduled' | 'live' | 'expired';
    author: string | null;
};

export type NotificationKind =
    | 'grade'
    | 'task'
    | 'deadline'
    | 'seat'
    | 'shift'
    | 'report'
    | 'export'
    | 'approval'
    | 'class'
    | 'announcement'
    | 'info';

export type NotificationItem = {
    id: string;
    kind: NotificationKind;
    title: string;
    body: string;
    url: string | null;
    read: boolean;
    createdAt: string;
};
