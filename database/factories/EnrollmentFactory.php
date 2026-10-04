<?php

namespace Database\Factories;

use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Enrollment>
 */
class EnrollmentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'class_id' => LabClass::factory(),
            'user_id' => User::factory(),
            'joined_at' => now(),
        ];
    }
}
