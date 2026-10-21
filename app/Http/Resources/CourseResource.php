<?php

namespace App\Http\Resources;

use App\Models\Course;
use App\Models\User;
use App\Support\CourseColor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk data Mata Kuliah untuk frontend — lihat resources/js/types/course.ts.
 *
 * @mixin Course
 */
class CourseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'semesterId' => $this->semester_id,
            'code' => $this->code,
            'name' => $this->name,
            'color' => CourseColor::for($this->resource),
            'credits' => $this->credits,
            'weights' => [
                'pretest' => $this->weight_pretest,
                'posttest' => $this->weight_posttest,
                'report' => $this->weight_report,
            ],
            'assistants' => $this->whenLoaded('assistants', fn () => $this->assistants
                ->map(fn (User $user) => ['id' => $user->id, 'name' => $user->name])
                ->values()),
            'approvalStatus' => $this->approval_status->value,
            'proposedBy' => $this->whenLoaded('proposer', fn () => $this->proposer?->name),
            'proposedAt' => $this->created_at?->toIso8601String(),
            'rejectionReason' => $this->rejection_reason,
            'canEdit' => $this->isEditable(),
        ];
    }
}
