<?php

namespace App\Concerns;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Aturan field Mata Kuliah (US-D02-1): kode unik per semester, bobot
 * Pre-test + Post-test + Laporan = 100%.
 */
trait CourseValidationRules
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    protected function courseRules(int $semesterId, ?int $ignoreCourseId = null): array
    {
        return [
            'code' => [
                'required', 'string', 'max:20', 'alpha_dash:ascii',
                Rule::unique('courses', 'code')->where('semester_id', $semesterId)->ignore($ignoreCourseId),
            ],
            'name' => ['required', 'string', 'max:120'],
            'credits' => ['required', 'integer', 'between:1,6'],
            'weight_pretest' => ['required', 'integer', 'between:0,100'],
            'weight_posttest' => ['required', 'integer', 'between:0,100'],
            'weight_report' => ['required', 'integer', 'between:0,100'],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    protected function courseWeightsMustTotal100(): array
    {
        return [function (Validator $validator) {
            $data = $validator->getData();
            $total = (int) ($data['weight_pretest'] ?? 0) + (int) ($data['weight_posttest'] ?? 0) + (int) ($data['weight_report'] ?? 0);

            if ($total !== 100 && ! $validator->errors()->hasAny(['weight_pretest', 'weight_posttest', 'weight_report'])) {
                $validator->errors()->add('weights', "Total bobot harus 100% (saat ini {$total}%).");
            }
        }];
    }

    /**
     * @return array<string, string>
     */
    protected function courseAttributes(): array
    {
        return [
            'code' => 'kode',
            'name' => 'nama mata kuliah',
            'credits' => 'SKS',
            'weight_pretest' => 'bobot pre-test',
            'weight_posttest' => 'bobot post-test',
            'weight_report' => 'bobot laporan',
            'assistant_ids' => 'asisten pengampu',
        ];
    }
}
