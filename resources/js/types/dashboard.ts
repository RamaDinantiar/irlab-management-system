/**
 * Kontrak data Dashboard Asisten — harus sama dengan
 * app/Support/Dashboard/AsistenDashboardData.php.
 */

export type ScheduleColor =
    | 'red'
    | 'green'
    | 'orange'
    | 'yellow'
    | 'blue'
    | 'purple'
    | 'pink'
    | 'cyan'
    | 'brown'
    | 'lime'
    | 'teal';

export type ScheduleEvent = {
    id: string;
    type: 'class' | 'shift';
    title: string;
    subtitle: string;
    room: string;
    /** 1 = Senin … 7 = Minggu (ISO-8601). */
    day: number;
    /** "HH:MM", WIB. */
    start: string;
    end: string;
    color: ScheduleColor;
    running: boolean;
};

export type DashboardAlert = {
    key: string;
    label: string;
    count: number;
    href: string;
    tone: 'warning' | 'danger' | 'info';
};

export type GradingQueueItem = {
    id: string;
    course: string;
    className: string;
    task: string;
    type: 'pretest' | 'posttest' | 'report';
    graded: number;
    submitted: number;
    href: string;
};

export type ActivityItem = {
    id: string;
    type: 'submission' | 'enrollment' | 'program';
    message: string;
    /** ISO-8601. */
    at: string;
};

/** Sesi kelas yang sedang berlangsung — app/Support/Dashboard/LiveSessions.php. */
type LiveSessionBase = {
    meetingId: number;
    classId: number;
    course: string;
    className: string;
    number: number;
    topic: string | null;
    room: string | null;
    startsAt: string;
    endsAt: string;
};

export type AsistenLiveSession = LiveSessionBase & {
    members: number;
    attendanceCount: number;
    /** Tugas kelas ini yang sedang terbuka. */
    tasks: {
        id: number;
        taskId: number;
        title: string;
        type: 'pretest' | 'posttest' | 'report';
        dueAt: string | null;
        submitted: number;
    }[];
};

export type PraktikanLiveSession = LiveSessionBase & {
    seat: string | null;
    /** Pre/Post-Test yang sedang dibuka asisten. */
    tests: {
        id: number;
        title: string;
        type: 'pretest' | 'posttest';
        dueAt: string | null;
        submitted: boolean;
        href: string;
    }[];
};

export type AsistenDashboard = {
    /** true selama sebagian data masih contoh (fitur belum dibangun). */
    isSample: boolean;
    /** Laporan ngawas yang belum diisi. */
    pendingReports: number;
    /** Pre/Post-Test terkumpul yang belum dinilai. */
    pendingGrading: number;
    nextShift: {
        title: string;
        room: string;
        startsAt: string;
        endsAt: string;
    } | null;
    alerts: DashboardAlert[];
    week: {
        /** Tanggal Senin minggu ini, "YYYY-MM-DD". */
        start: string;
        /** Hari ini, 1–7. */
        today: number;
        events: ScheduleEvent[];
    };
    gradingQueue: GradingQueueItem[];
    activities: ActivityItem[];
};

/**
 * Kontrak data Dashboard Praktikan — harus sama dengan
 * app/Support/Dashboard/PraktikanDashboardData.php.
 */

export type UpcomingTask = {
    id: string;
    title: string;
    course: string;
    type: 'pretest' | 'posttest' | 'report';
    /** ISO-8601. */
    dueAt: string;
    status: 'not_submitted' | 'submitted' | 'late';
    href: string;
};

export type CourseProgress = {
    id: string;
    course: string;
    className: string;
    submitted: number;
    total: number;
    /** Nilai akhir sementara berbobot (A6); null jika belum ada nilai terbit. */
    score: number | null;
    href: string;
};

export type FeedbackItem = {
    id: string;
    task: string;
    course: string;
    score: number;
    maxScore: number;
    excerpt: string;
    grader: string;
    gradedAt: string;
    href: string;
};

export type Announcement = {
    id: string;
    title: string;
    body: string;
    scope: 'global' | 'class';
    className: string | null;
    pinned: boolean;
    publishedAt: string;
};

export type PraktikanDashboard = {
    /** true selama sebagian data masih contoh (fitur belum dibangun). */
    isSample: boolean;
    /** false → tampilkan panduan 3 langkah (belum tergabung ke kelas). */
    hasClasses: boolean;
    nextClass: {
        course: string;
        className: string;
        /** Materi pertemuan berikutnya; null bila belum ditentukan. */
        topic: string | null;
        room: string;
        assistant: string;
        /** Label kursi hasil kontrak, null jika belum kontrak. */
        seat: string | null;
        startsAt: string;
        endsAt: string;
    } | null;
    /** Tugas terbuka yang belum dikumpulkan. */
    pendingTasks: number;
    openProgram: {
        title: string;
        type: string;
        closesAt: string;
        quota: number;
        registered: number;
        href: string;
    } | null;
    week: AsistenDashboard['week'];
    upcomingTasks: UpcomingTask[];
    courseProgress: CourseProgress[];
    recentFeedback: FeedbackItem[];
    announcements: Announcement[];
};

/**
 * Kontrak data Dashboard Admin — harus sama dengan
 * app/Support/Dashboard/AdminDashboardData.php.
 */

export type ApprovalRequest = {
    id: string;
    type: 'course' | 'class';
    name: string;
    detail: string;
    requestedBy: string;
    requestedAt: string;
    href: string;
};

export type ActiveProgram = {
    id: string;
    type: string;
    title: string;
    status: string;
    registered: number;
    /** null = tanpa batas kuota (mis. rekrutmen). */
    quota: number | null;
    href: string;
};

export type AuditLogItem = {
    id: string;
    actor: string;
    action: string;
    target: string;
    at: string;
};

export type AdminDashboard = {
    /** true selama sebagian data masih contoh (fitur belum dibangun). */
    isSample: boolean;
    semester: {
        name: string;
        startsOn: string;
        endsOn: string;
        week: number;
        totalWeeks: number;
    } | null;
    counts: {
        praktikan: number;
        asisten: number;
        classes: number;
        courses: number;
    };
    /** Laporan ngawas bulan ini; KPI: tepat hari yang sama ≥ target %. */
    reportCompliance: {
        month: string;
        onTime: number;
        submitted: number;
        expected: number;
        target: number;
    };
    approvals: ApprovalRequest[];
    gradingQueue: GradingQueueItem[];
    activePrograms: ActiveProgram[];
    auditLogs: AuditLogItem[];
};
