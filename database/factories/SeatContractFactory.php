<?php

namespace Database\Factories;

use App\Models\LabClass;
use App\Models\Seat;
use App\Models\SeatContract;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SeatContract>
 */
class SeatContractFactory extends Factory
{
    public function definition(): array
    {
        return [
            'class_id' => LabClass::factory(),
            'seat_id' => Seat::factory(),
            'user_id' => User::factory(),
            'snapshot_name' => fake()->name(),
            'snapshot_nim' => (string) fake()->unique()->numerify('2023#####'),
            'snapshot_major' => 'S1 Informatika',
        ];
    }
}
