<?php

namespace Database\Factories;

use App\Enums\ApprovalStatus;
use App\Models\Course;
use App\Models\Semester;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Course>
 */
class CourseFactory extends Factory
{
    public function definition(): array
    {
        return [
            'semester_id' => Semester::factory()->active(),
            'code' => 'IF-'.fake()->unique()->numerify('3###'),
            'name' => fake()->randomElement(['Machine Learning', 'Deep Learning', 'Information Retrieval', 'Mobile Programming', 'Database System']),
            'credits' => 3,
            'weight_pretest' => 20,
            'weight_posttest' => 30,
            'weight_report' => 50,
        ];
    }

    public function pending(?User $proposer = null): static
    {
        return $this->state(fn () => [
            'approval_status' => ApprovalStatus::Pending,
            'proposed_by' => $proposer->id ?? User::factory()->asisten(),
        ]);
    }
}
