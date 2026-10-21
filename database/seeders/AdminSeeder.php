<?php

namespace Database\Seeders;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

/**
 * Akun Admin tetap untuk produksi (aman dijalankan berulang):
 *   php artisan db:seed --class=AdminSeeder --force
 *
 * Nama & email dari ADMIN_NAME / ADMIN_EMAIL. Kata sandi dari ADMIN_PASSWORD; bila
 * kosong dibuatkan acak dan ditampilkan sekali. Apa pun sumbernya, kata sandi
 * wajib diganti saat login pertama. Akun yang sudah ada tidak diubah.
 */
class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $name = trim((string) config('lab.admin.name'));
        $email = Str::lower(trim((string) config('lab.admin.email')));
        $password = (string) config('lab.admin.password');

        if (User::where('email', $email)->exists()) {
            $this->command->info("Admin {$email} sudah ada — tidak diubah.");

            return;
        }

        $generated = $password === '';
        $password = $generated ? Str::password(16, symbols: false) : $password;

        $validator = Validator::make(compact('name', 'email', 'password'), [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', Password::min(12)->letters()->mixedCase()->numbers()],
        ], [], ['name' => 'ADMIN_NAME', 'email' => 'ADMIN_EMAIL', 'password' => 'ADMIN_PASSWORD']);

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        $admin = new User(['name' => $name, 'email' => $email, 'password' => $password]);
        $admin->forceFill([
            'role' => Role::Admin,
            'is_active' => true,
            'must_change_password' => true,
            'email_verified_at' => now(),
        ])->save();

        $this->command->info("Admin {$email} dibuat. Wajib ganti kata sandi saat login pertama.");

        if ($generated) {
            $this->command->warn("Kata sandi sementara (hanya ditampilkan sekali): {$password}");
        } else {
            $this->command->warn('Hapus ADMIN_PASSWORD dari .env setelah ini.');
        }
    }
}
