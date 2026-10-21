import { Head, router } from '@inertiajs/react';
import { Search, UserPlus, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { CredentialsDialog } from '@/components/users/credentials-dialog';
import { ImportUsersDialog } from '@/components/users/import-users-dialog';
import { UserFormDialog } from '@/components/users/user-form-dialog';
import { UserRowActions } from '@/components/users/user-row-actions';
import { positionLabels, roleLabels } from '@/config/navigation';
import type { Paginated, UserRow } from '@/types';

type Filters = { search: string; role: string; status: string };

const ALL = 'all';

function RoleCell({ user }: { user: UserRow }) {
    return (
        <span className="flex flex-wrap gap-1">
            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {roleLabels[user.role]}
            </Badge>
            {user.role === 'asisten' && (
                <Badge variant="outline">{positionLabels[user.position]}</Badge>
            )}
        </span>
    );
}

function StatusCell({ user }: { user: UserRow }) {
    return (
        <span className="flex flex-wrap gap-1">
            {user.isActive ? (
                <Badge variant="success">Aktif</Badge>
            ) : (
                <Badge variant="destructive">Nonaktif</Badge>
            )}
            {user.mustChangePassword && (
                <Badge variant="warning">Password sementara</Badge>
            )}
        </span>
    );
}

/** Admin › Pengguna (US-D04, FR-ADM-07). */
export default function UsersIndex({
    users,
    filters,
    counts,
}: {
    users: Paginated<UserRow>;
    filters: Filters;
    counts: Record<'praktikan' | 'asisten' | 'admin', number>;
}) {
    const [search, setSearch] = useState(filters.search);
    const first = useRef(true);

    const apply = (next: Partial<Filters>) => {
        const query = { ...filters, search, ...next };
        router.get(
            UserController.index.url(),
            Object.fromEntries(
                Object.entries(query).filter(
                    ([, value]) => value !== '' && value !== ALL,
                ),
            ),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    // Pencarian otomatis 300 ms setelah berhenti mengetik.
    useEffect(() => {
        if (first.current) {
            first.current = false;

            return;
        }

        const timer = window.setTimeout(() => apply({ search }), 300);

        return () => window.clearTimeout(timer);
    }, [search]);

    return (
        <>
            <Head title="Pengguna" />
            <CredentialsDialog />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Pengguna"
                    description={`${counts.praktikan} praktikan · ${counts.asisten} asisten · ${counts.admin} admin. Akun dibuat Admin (tanpa registrasi mandiri); setiap akun baru wajib mengganti password sementara.`}
                    actions={
                        <>
                            <ImportUsersDialog />
                            <UserFormDialog
                                trigger={
                                    <Button>
                                        <UserPlus /> Tambah Pengguna
                                    </Button>
                                }
                            />
                        </>
                    }
                />

                <div className="flex flex-wrap items-end gap-3">
                    <div className="grid min-w-64 flex-1 gap-2">
                        <Label htmlFor="user-search">Cari</Label>
                        <div className="relative">
                            <Search
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden
                            />
                            <Input
                                id="user-search"
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Nama, NIM, atau email"
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="filter-role">Peran</Label>
                        <Select
                            value={filters.role || ALL}
                            onValueChange={(role) => apply({ role })}
                        >
                            <SelectTrigger id="filter-role" className="w-40">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>Semua peran</SelectItem>
                                <SelectItem value="praktikan">
                                    Praktikan
                                </SelectItem>
                                <SelectItem value="asisten">
                                    Asisten Lab
                                </SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="filter-status">Status</Label>
                        <Select
                            value={filters.status || ALL}
                            onValueChange={(status) => apply({ status })}
                        >
                            <SelectTrigger id="filter-status" className="w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={ALL}>
                                    Semua status
                                </SelectItem>
                                <SelectItem value="active">Aktif</SelectItem>
                                <SelectItem value="inactive">
                                    Nonaktif
                                </SelectItem>
                                <SelectItem value="must_change">
                                    Password sementara
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {users.data.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="Tidak ada pengguna"
                        description="Ubah kata kunci atau filter pencarian."
                    />
                ) : (
                    <>
                        <div className="hidden border md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>NIM</TableHead>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Peran</TableHead>
                                        <TableHead>
                                            Jurusan · Angkatan
                                        </TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">
                                            Aksi
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.data.map((user) => (
                                        <TableRow
                                            key={user.id}
                                            className={
                                                user.isActive
                                                    ? undefined
                                                    : 'bg-muted/60'
                                            }
                                        >
                                            <TableCell className="font-mono font-bold text-primary-700">
                                                {user.nim ?? '—'}
                                            </TableCell>
                                            <TableCell>
                                                <span className="block font-bold">
                                                    {user.name}
                                                    {user.isSelf && (
                                                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                                                            (Anda)
                                                        </span>
                                                    )}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {user.email}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <RoleCell user={user} />
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {user.major ?? '—'}
                                                {user.cohortYear &&
                                                    ` · ${user.cohortYear}`}
                                            </TableCell>
                                            <TableCell>
                                                <StatusCell user={user} />
                                            </TableCell>
                                            <TableCell>
                                                <UserRowActions user={user} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <ul className="grid gap-3 md:hidden">
                            {users.data.map((user) => (
                                <li
                                    key={user.id}
                                    className="space-y-2 border bg-card p-4"
                                >
                                    <p className="font-mono text-sm font-bold text-primary-700">
                                        {user.nim ?? '—'}
                                    </p>
                                    <p className="font-bold">{user.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {user.email}
                                    </p>
                                    <RoleCell user={user} />
                                    <StatusCell user={user} />
                                    <UserRowActions user={user} />
                                </li>
                            ))}
                        </ul>
                        <Pagination paginator={users} />
                    </>
                )}
            </div>
        </>
    );
}
