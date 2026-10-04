import type { Position, Role } from './auth';

/** Baris Admin › Pengguna — sama dengan UserController@index. */
export type UserRow = {
    id: number;
    nim: string | null;
    name: string;
    email: string;
    role: Role;
    position: Position;
    major: string | null;
    cohortYear: number | null;
    isActive: boolean;
    mustChangePassword: boolean;
    isSelf: boolean;
};

/** Paginator Laravel (`->paginate()`). */
export type Paginated<T> = {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: { url: string | null; label: string; active: boolean }[];
};

export type ImportResult = {
    created: number;
    total: number;
    failed: { row: number; nim: string | null; errors: string[] }[];
};

export type IssuedCredentials = {
    name: string;
    login: string;
    password: string;
};
