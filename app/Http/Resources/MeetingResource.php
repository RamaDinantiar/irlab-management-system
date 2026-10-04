<?php

namespace App\Http\Resources;

use App\Models\Meeting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Meeting
 */
class MeetingResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'date' => $this->date->toDateString(),
            'moduleTitle' => $this->module_title,
            'moduleFile' => $this->whenLoaded('moduleFile', fn () => $this->moduleFile?->toClient(inline: true)),
            'moduleReleaseAt' => $this->module_release_at?->toIso8601String(),
            'moduleReleased' => $this->isModuleReleased(),
            'responsibleAssistant' => $this->whenLoaded('responsibleAssistant', fn () => $this->responsibleAssistant
                ? ['id' => $this->responsibleAssistant->id, 'name' => $this->responsibleAssistant->name]
                : null),
            'startedAt' => $this->started_at?->toIso8601String(),
            'attendanceCount' => $this->whenCounted('attendances'),
        ];
    }
}
