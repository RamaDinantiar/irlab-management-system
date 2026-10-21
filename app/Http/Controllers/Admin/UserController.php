<?php

namespace App\Http\Controllers\Admin;

use App\Actions\User\CreateUserAccount;
use App\Actions\User\ImportUsers;
use App\Actions\User\IssueTemporaryPassword;
use App\Actions\User\SetUserActive;
use App\Enums\Position;
use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UserRequest;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Admin › Pengguna (US-D04, FR-ADM-07): CRUD, import, peran & jabatan,
 * nonaktifkan, reset password.
 */
class UserController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'role' => ['nullable', Rule::enum(Role::class)],
            'status' => ['nullable', 'in:active,inactive,must_change'],
        ]);

        $users = User::query()
            ->when($filters['search'] ?? null, fn ($query, $search) => $query->where(fn ($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('nim', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")))
            ->when($filters['role'] ?? null, fn ($query, $role) => $query->where('role', $role))
            ->when($filters['status'] ?? null, fn ($query, $status) => match ($status) {
                'active' => $query->where('is_active', true),
                'inactive' => $query->where('is_active', false),
                'must_change' => $query->where('must_change_password', true),
                default => $query,
            })
            ->orderByRaw("CASE role WHEN 'admin' THEN 0 WHEN 'asisten' THEN 1 ELSE 2 END")
            ->orderBy('name')
            ->paginate(25) // PRD 8.3: paginasi server-side 25 baris
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'nim' => $user->nim,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role->value,
                'position' => $user->position->value,
                'major' => $user->major,
                'cohortYear' => $user->cohort_year,
                'isActive' => $user->is_active,
                'mustChangePassword' => $user->must_change_password,
                'isSelf' => $user->is($request->user()),
            ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'role' => $filters['role'] ?? '',
                'status' => $filters['status'] ?? '',
            ],
            'counts' => [
                'praktikan' => User::where('role', Role::Praktikan)->count(),
                'asisten' => User::where('role', Role::Asisten)->count(),
                'admin' => User::where('role', Role::Admin)->count(),
            ],
        ]);
    }

    public function store(UserRequest $request, CreateUserAccount $create): RedirectResponse
    {
        [$user, $password] = $create($request->accountData());

        Inertia::flash('credentials', ['name' => $user->name, 'login' => $user->nim ?? $user->email, 'password' => $password]);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Akun {$user->name} dibuat. Email aktivasi dikirim ke {$user->email}."]);

        return to_route('admin.users.index');
    }

    public function update(UserRequest $request, User $user): RedirectResponse
    {
        $before = $user->only(['nim', 'name', 'email', 'major', 'cohort_year', 'role', 'position']);

        $user->fill($request->safe()->only(['nim', 'name', 'email', 'major', 'cohort_year']));
        $role = Role::from($request->validated('role'));
        $user->forceFill([
            'role' => $role,
            'position' => $role === Role::Asisten ? Position::from($request->validated('position')) : Position::None,
        ])->save();

        // US-D04-3: perubahan peran & jabatan tercatat di audit log.
        $action = $before['role'] !== $user->role || $before['position'] !== $user->position ? 'user.role_changed' : 'user.updated';
        AuditLog::record($action, $user, $this->serialize($before), $this->serialize($user->only(array_keys($before))));
        Inertia::flash('toast', ['type' => 'success', 'message' => "Akun {$user->name} diperbarui."]);

        return back();
    }

    public function activation(Request $request, User $user, SetUserActive $setActive): RedirectResponse
    {
        abort_if($user->is($request->user()), 403, 'Anda tidak dapat menonaktifkan akun Anda sendiri.');

        $active = $request->boolean('active');
        $setActive($user, $active);

        Inertia::flash('toast', ['type' => 'success', 'message' => $active
            ? "Akun {$user->name} diaktifkan kembali."
            : "Akun {$user->name} dinonaktifkan; semua sesinya diakhiri."]);

        return back();
    }

    public function resetPassword(User $user, IssueTemporaryPassword $issue): RedirectResponse
    {
        $password = $issue($user, isReset: true);
        AuditLog::record('user.password_reset', $user);

        Inertia::flash('credentials', ['name' => $user->name, 'login' => $user->nim ?? $user->email, 'password' => $password]);
        Inertia::flash('toast', ['type' => 'success', 'message' => "Password sementara baru untuk {$user->name} dikirim ke {$user->email}."]);

        return back();
    }

    public function import(Request $request, ImportUsers $import): RedirectResponse
    {
        $request->validate(
            ['file' => ['required', 'file', 'mimes:csv,txt,xlsx', 'max:2048']],
            ['file.mimes' => 'Format file harus CSV atau XLSX.'],
            ['file' => 'file'],
        );

        $result = $import($request->file('file'));

        Inertia::flash('importResult', $result);
        Inertia::flash('toast', [
            'type' => $result['failed'] === [] ? 'success' : 'warning',
            'message' => "{$result['created']} akun praktikan dibuat".(count($result['failed']) ? ', '.count($result['failed']).' baris gagal.' : '.'),
        ]);

        return to_route('admin.users.index');
    }

    public function template(): StreamedResponse
    {
        return response()->streamDownload(function () {
            echo "nim,nama,email,jurusan,angkatan\n";
            echo "202331001,Rina Praktikan,rina@itpln.ac.id,S1 Teknik Informatika,2023\n";
        }, 'template-import-praktikan.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function serialize(array $data): array
    {
        return array_map(fn ($value) => $value instanceof \BackedEnum ? $value->value : $value, $data);
    }
}
