<?php

namespace Database\Factories;

use App\Models\Program;
use App\Models\ProgramRegistration;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProgramRegistration>
 */
class ProgramRegistrationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'program_id' => Program::factory(),
            'user_id' => User::factory(),
            'answers_json' => [],
            'status' => 'registered',
        ];
    }
}
