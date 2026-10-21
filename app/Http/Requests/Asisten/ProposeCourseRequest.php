<?php

namespace App\Http\Requests\Asisten;

use App\Concerns\CourseValidationRules;
use App\Enums\ApprovalStatus;
use App\Models\Course;
use App\Models\Semester;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Asisten mengajukan Mata Kuliah baru atau merevisi pengajuannya (FR-AS-02).
 * Hanya untuk semester aktif; status kembali "Menunggu Persetujuan".
 */
class ProposeCourseRequest extends FormRequest
{
    use CourseValidationRules;

    public function authorize(): bool
    {
        $course = $this->route('course');

        if ($course instanceof Course) {
            // Hanya pengajuan milik sendiri yang belum disetujui yang bisa direvisi.
            return $course->proposed_by === $this->user()->id
                && $course->approval_status !== ApprovalStatus::Approved
                && $course->isEditable();
        }

        return Semester::current() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $course = $this->route('course');
        $semesterId = $course instanceof Course ? $course->semester_id : (int) Semester::current()?->id;

        return $this->courseRules($semesterId, $course instanceof Course ? $course->id : null);
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return $this->courseWeightsMustTotal100();
    }

    public function attributes(): array
    {
        return $this->courseAttributes();
    }
}
