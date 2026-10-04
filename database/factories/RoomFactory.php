<?php

namespace Database\Factories;

use App\Models\Room;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Room>
 */
class RoomFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Lab IR '.fake()->unique()->numberBetween(1, 99),
            'rows' => 6,
            'cols' => 8,
        ];
    }
}
