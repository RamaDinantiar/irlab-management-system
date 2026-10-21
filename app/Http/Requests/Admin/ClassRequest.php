<?php

namespace App\Http\Requests\Admin;

use App\Concerns\ClassValidationRules;
use App\Enums\Role;
use App\Models\LabClass;
use App\Models\Semester;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Admin: buat/ubah Kelas & Jadwal + asisten pengampu (US-D02-2/3).
 */
class ClassRequest extends FormRequest
{
    use ClassValidationRules;

    public function semester(): Semester
    {
        $class = $this->route('class');

        return $class instanceof LabClass ? $class->semester : Semester::findOrFail($this->integer('semester_id'));
    }

    public function authorize(): bool
    {
        return $this->semester()->isEditable();
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $class = $this->route('class');

        return [
            ...($class instanceof LabClass ? [] : ['semester_id' => ['required', 'integer', 'exists:semesters,id']]),
            ...$this->classRules($this->semester()->id, $class instanceof LabClass ? $class->id : null),
            'assistant_ids' => ['array'],
            'assistant_ids.*' => ['integer', Rule::exists('users', 'id')->where('role', Role::Asisten->value)],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        $class = $this->route('class');

        return [$this->scheduleConflicts(
            $this->semester()->id,
            array_map('intval', (array) $this->input('assistant_ids', [])),
            $class instanceof LabClass ? $class->id : null,
        )];
    }

    public function attributes(): array
    {
        return $this->classAttributes();
    }

    public function messages(): array
    {
        return $this->classMessages();
    }
}
