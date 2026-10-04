<?php

namespace App\Http\Requests\Admin;

use App\Concerns\CourseValidationRules;
use App\Enums\Role;
use App\Models\Course;
use App\Models\Semester;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Admin: buat/ubah Mata Kuliah + asisten pengampu (US-D02-1, US-D02-2).
 */
class CourseRequest extends FormRequest
{
    use CourseValidationRules;

    public function semester(): Semester
    {
        $course = $this->route('course');

        return $course instanceof Course
            ? $course->semester
            : Semester::findOrFail($this->integer('semester_id'));
    }

    public function authorize(): bool
    {
        // Data semester arsip read-only.
        return $this->semester()->isEditable();
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $course = $this->route('course');

        return [
            ...($course instanceof Course ? [] : ['semester_id' => ['required', 'integer', 'exists:semesters,id']]),
            ...$this->courseRules($this->semester()->id, $course instanceof Course ? $course->id : null),
            'assistant_ids' => ['array'],
            'assistant_ids.*' => ['integer', Rule::exists('users', 'id')->where('role', Role::Asisten->value)],
        ];
    }

    public function after(): array
    {
        return $this->courseWeightsMustTotal100();
    }

    public function attributes(): array
    {
        return $this->courseAttributes();
    }
}
