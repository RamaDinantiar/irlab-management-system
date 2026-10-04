<?php

namespace App\Actions\User;

use App\Enums\Position;
use App\Enums\Role;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Admin membuat akun (US-D04-1, PRD A1: tidak ada registrasi mandiri).
 * Email dianggap terverifikasi karena berasal dari data resmi lab.
 */
class CreateUserAccount
{
    public function __construct(private readonly IssueTemporaryPassword $issuePassword) {}

    /**
     * @param  array{nim?: string|null, name: string, email: string, major?: string|null, cohort_year?: int|null, role?: string, position?: string}  $data
     * @return array{0: User, 1: string}
     */
    public function __invoke(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $user = new User([
                'nim' => $data['nim'] ?? null,
                'name' => $data['name'],
                'email' => $data['email'],
                'major' => $data['major'] ?? null,
                'cohort_year' => $data['cohort_year'] ?? null,
            ]);

            $role = Role::from($data['role'] ?? Role::Praktikan->value);
            $user->forceFill([
                'role' => $role,
                'position' => $role === Role::Asisten ? Position::from($data['position'] ?? 'none') : Position::None,
                'email_verified_at' => now(),
                // Diganti oleh IssueTemporaryPassword.
                'password' => str()->random(40),
            ])->save();

            $password = ($this->issuePassword)($user);

            AuditLog::record('user.created', $user, null, $user->only(['nim', 'name', 'email', 'role', 'position']));

            return [$user, $password];
        });
    }
}
