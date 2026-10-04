<?php

namespace Database\Factories;

use App\Models\Grade;
use App\Models\Submission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Grade>
 */
class GradeFactory extends Factory
{
    public function definition(): array
    {
        return [
            'submission_id' => Submission::factory(),
            'score' => fake()->numberBetween(60, 100),
            'feedback' => 'Bagus.',
            'graded_at' => now(),
            'status' => 'draft',
            'version' => 1,
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => ['status' => 'published', 'published_at' => now()]);
    }
}
