<?php

namespace Database\Factories;

use App\Enums\SemesterStatus;
use App\Models\Semester;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Semester>
 */
class SemesterFactory extends Factory
{
    public function definition(): array
    {
        $year = fake()->unique()->numberBetween(2015, 2040);

        return [
            'name' => "Ganjil {$year}/".($year + 1),
            'start_date' => "{$year}-08-24",
            'end_date' => "{$year}-12-18",
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => [
            'status' => SemesterStatus::Active,
            'activated_at' => now(),
        ]);
    }

    public function archived(): static
    {
        return $this->state(fn () => [
            'status' => SemesterStatus::Archived,
            'archived_at' => now(),
        ]);
    }
}
