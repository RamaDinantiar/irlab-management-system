<?php

namespace Database\Factories;

use App\Enums\ApprovalStatus;
use App\Models\Course;
use App\Models\LabClass;
use App\Models\Room;
use App\Models\User;
use App\Support\JoinToken;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LabClass>
 */
class LabClassFactory extends Factory
{
    protected $model = LabClass::class;

    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'semester_id' => fn (array $attributes) => Course::find($attributes['course_id'])->semester_id,
            'name' => 'Kelas '.fake()->unique()->randomLetter(),
            'day_of_week' => 1,
            'start_time' => '07:20',
            'end_time' => '09:50',
            'room_id' => Room::factory(),
            'quota' => 30,
            'join_token' => fn (array $attributes) => JoinToken::generate($attributes['semester_id']),
        ];
    }

    public function pending(?User $proposer = null): static
    {
        return $this->state(fn () => [
            'approval_status' => ApprovalStatus::Pending,
            'proposed_by' => $proposer?->id ?? User::factory()->asisten(),
            'join_token' => null,
        ]);
    }
}
