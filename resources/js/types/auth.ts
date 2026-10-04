export type Role = 'praktikan' | 'asisten' | 'admin';

export type Position = 'none' | 'sekretaris' | 'bendahara';

export type User = {
    id: number;
    nim: string | null;
    name: string;
    email: string;
    role: Role;
    position: Position;
    major: string | null;
    cohort_year: number | null;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
    session: {
        /** Batas idle sesi dalam menit (SESSION_LIFETIME). */
        lifetime: number;
        /** Masuk dengan Remember Me → tidak dipaksa logout saat idle. */
        remembered: boolean;
    } | null;
};
