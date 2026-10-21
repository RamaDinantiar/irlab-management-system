<?php

namespace Database\Factories;

use App\Enums\ProgramType;
use App\Models\Program;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Program>
 */
class ProgramFactory extends Factory
{
    public function definition(): array
    {
        return [
            'type' => ProgramType::Workshop,
            'title' => 'Workshop '.fake()->word().' '.fake()->word().' '.fake()->word(),
            'category' => 'Artificial Intelligence',
            'description' => fake()->paragraph(),
            'speaker_name' => fake()->name(),
            'mode' => 'offline',
            'location' => 'Lab IR 1',
            'starts_at' => now()->addWeek()->setTime(9, 0),
            'ends_at' => now()->addWeek()->setTime(15, 0),
            'quota' => 40,
            'status' => 'open',
            'opens_at' => now()->subDay(),
            'closes_at' => now()->addDays(5),
        ];
    }

    public function type(ProgramType $type): static
    {
        return $this->state(fn () => ['type' => $type]);
    }
}
