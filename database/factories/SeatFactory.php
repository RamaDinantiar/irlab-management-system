<?php

namespace Database\Factories;

use App\Models\Room;
use App\Models\Seat;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Seat>
 */
class SeatFactory extends Factory
{
    public function definition(): array
    {
        return [
            'room_id' => Room::factory(),
            'label' => fn () => 'PC-'.str_pad((string) fake()->unique()->numberBetween(1, 999), 2, '0', STR_PAD_LEFT),
            'row' => fn () => fake()->unique()->numberBetween(1, 20),
            'col' => fn () => fake()->unique()->numberBetween(1, 20),
            'type' => 'seat',
        ];
    }
}
