<?php

namespace App\Http\Requests\Admin;

use App\Enums\Position;
use App\Enums\Role;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Admin: buat/ubah akun, peran & jabatan (US-D04, FR-ADM-07).
 */
class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->route('user');

        return [
            'role' => ['required', Rule::enum(Role::class)],
            'position' => ['required', Rule::enum(Position::class)],
            // NIM wajib untuk Praktikan & Asisten (login dengan NIM, FR-AUTH-01).
            'nim' => [Rule::requiredIf($this->input('role') !== Role::Admin->value), 'nullable', 'regex:/^\d{5,20}$/', Rule::unique('users', 'nim')->ignore($user)],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user)],
            'major' => ['nullable', 'string', 'max:255'],
            'cohort_year' => ['nullable', 'integer', 'between:2000,2100'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            // Jabatan hanya untuk Asisten.
            if ($this->input('role') !== Role::Asisten->value && $this->input('position', 'none') !== Position::None->value) {
                $validator->errors()->add('position', 'Jabatan Sekretaris/Bendahara hanya untuk Asisten.');
            }

            // Admin tidak dapat menurunkan perannya sendiri (mencegah lab tanpa Admin).
            $user = $this->route('user');
            if ($user instanceof User && $user->is($this->user()) && $this->input('role') !== Role::Admin->value) {
                $validator->errors()->add('role', 'Anda tidak dapat mengubah peran akun Anda sendiri.');
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['role' => 'peran', 'position' => 'jabatan', 'nim' => 'NIM', 'name' => 'nama', 'major' => 'jurusan', 'cohort_year' => 'angkatan'];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['nim.regex' => 'NIM harus 5–20 digit angka.', 'nim.required' => 'NIM wajib diisi untuk Praktikan dan Asisten.'];
    }
}
