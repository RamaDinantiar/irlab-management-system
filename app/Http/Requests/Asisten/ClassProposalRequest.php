<?php

namespace App\Http\Requests\Asisten;

use App\Concerns\ClassValidationRules;
use App\Enums\ApprovalStatus;
use App\Models\LabClass;
use App\Models\Semester;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Asisten mengajukan Kelas baru pada Mata Kuliah yang diampu (US-A01-1) atau
 * mengubah jadwal kelasnya (FR-AS-02).
 */
class ClassProposalRequest extends FormRequest
{
    use ClassValidationRules;

    public function authorize(): bool
    {
        $class = $this->route('class');

        if ($class instanceof LabClass) {
            return $class->isEditable() && $class->assistants()->whereKey($this->user()->id)->exists();
        }

        return Semester::current() !== null;
    }

    private function semesterId(): int
    {
        $class = $this->route('class');

        return $class instanceof LabClass ? $class->semester_id : (int) Semester::current()?->id;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $class = $this->route('class');
        $rules = $this->classRules($this->semesterId(), $class instanceof LabClass ? $class->id : null);

        // Hanya mata kuliah yang diampu sendiri.
        $rules['course_id'][] = Rule::exists('course_assistants', 'course_id')->where('user_id', $this->user()->id);

        return $rules;
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        $class = $this->route('class');
        $assistantIds = $class instanceof LabClass && $class->approval_status === ApprovalStatus::Approved
            ? $class->assistants()->pluck('users.id')->map(fn ($id) => (int) $id)->all()
            : [$this->user()->id];

        return [$this->scheduleConflicts($this->semesterId(), $assistantIds, $class instanceof LabClass ? $class->id : null)];
    }

    public function attributes(): array
    {
        return $this->classAttributes();
    }

    public function messages(): array
    {
        return [...$this->classMessages(), 'course_id.exists' => 'Pilih mata kuliah yang sudah disetujui dan Anda ampu.'];
    }
}
