<?php

namespace App\Http\Requests\Admin;

use App\Models\Semester;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Buat/ubah semester (US-D01-1). Peran Admin sudah dijaga middleware `role:admin`.
 */
class SemesterRequest extends FormRequest
{
    public function authorize(): bool
    {
        $semester = $this->route('semester');

        // Semester arsip read-only.
        return ! $semester instanceof Semester || $semester->isEditable();
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:50', Rule::unique('semesters', 'name')->ignore($this->route('semester'))],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nama semester',
            'start_date' => 'tanggal mulai',
            'end_date' => 'tanggal selesai',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'end_date.after' => 'Tanggal selesai harus setelah tanggal mulai.',
        ];
    }
}
