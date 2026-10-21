<?php

namespace App\Http\Requests\Settings;

use App\Concerns\ProfileValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ProfileUpdateRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // NIM & peran dikelola Admin; pengguna melengkapi program studi & angkatan (FR-PST-03).
        return [
            ...$this->profileRules($this->user()->id),
            'phone' => $this->phoneRules(required: false),
            'major' => ['nullable', 'string', 'max:255'],
            'cohort_year' => ['nullable', 'integer', 'between:2000,2100'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('phone')) {
            $this->merge(['phone' => self::normalizePhone($this->input('phone'))]);
        }
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['phone.regex' => 'Nomor HP tidak valid. Contoh: 081234567890.'];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return ['name' => 'nama', 'email' => 'email', 'phone' => 'nomor HP', 'major' => 'program studi', 'cohort_year' => 'angkatan'];
    }
}
