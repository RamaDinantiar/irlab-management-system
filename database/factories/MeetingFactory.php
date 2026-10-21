<?php

namespace Database\Factories;

use App\Models\LabClass;
use App\Models\Meeting;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Meeting>
 */
class MeetingFactory extends Factory
{
    public function definition(): array
    {
        return [
            'class_id' => LabClass::factory(),
            'number' => fake()->unique()->numberBetween(1, 200),
            'date' => now()->toDateString(),
            'topic' => ucfirst(fake()->word().' '.fake()->word()),
        ];
    }
}
