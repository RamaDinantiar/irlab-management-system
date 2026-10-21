<?php

namespace App\Http\Resources;

use App\Models\LabClass;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Bentuk data Kelas untuk frontend — lihat resources/js/types/class.ts.
 *
 * @mixin LabClass
 */
class LabClassResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'semesterId' => $this->semester_id,
            'course' => $this->whenLoaded('course', fn () => [
                'id' => $this->course->id,
                'code' => $this->course->code,
                'name' => $this->course->name,
                'credits' => $this->course->credits,
            ]),
            'name' => $this->name,
            'lecturer' => $this->lecturer,
            'dayOfWeek' => $this->day_of_week,
            'startTime' => $this->startClock(),
            'endTime' => $this->endClock(),
            'room' => $this->whenLoaded('room', fn () => ['id' => $this->room->id, 'name' => $this->room->name]),
            'quota' => $this->quota,
            'membersCount' => (int) ($this->enrollments_count ?? $this->enrollments()->count()),
            'joinToken' => $this->join_token,
            'isLocked' => $this->is_locked,
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
