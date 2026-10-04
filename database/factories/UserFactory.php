<?php

namespace Database\Factories;

use App\Enums\Position;
use App\Enums\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nim' => fake()->unique()->numerify('2023#####'),
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'role' => Role::Praktikan,
            'position' => Position::None,
            'major' => 'S1 Teknik Informatika',
            'cohort_year' => 2023,
        ];
    }

    public function asisten(Position $position = Position::None): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => Role::Asisten,
            'position' => $position,
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'nim' => null,
            'role' => Role::Admin,
            'major' => null,
            'cohort_year' => null,
        ]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
