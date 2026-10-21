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
            'topic' => $this->topic,
            'responsibleAssistant' => $this->whenLoaded('responsibleAssistant', fn () => $this->responsibleAssistant
                ? ['id' => $this->responsibleAssistant->id, 'name' => $this->responsibleAssistant->name]
                : null),
            'startedAt' => $this->started_at?->toIso8601String(),
            'endedAt' => $this->ended_at?->toIso8601String(),
            'startsAt' => $this->startsAt()->toIso8601String(),
            'endsAt' => $this->endsAt()->toIso8601String(),
            'started' => $this->hasStarted(),
            'running' => $this->isRunning(),
            'attendanceCount' => $this->whenCounted('attendances'),
        ];
    }
}
