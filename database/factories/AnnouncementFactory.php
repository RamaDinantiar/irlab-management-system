<?php

namespace Database\Factories;

use App\Models\Announcement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Announcement>
 */
class AnnouncementFactory extends Factory
{
    public function definition(): array
    {
        return [
            'scope' => 'global',
            'title' => fake()->sentence(5),
            'body' => fake()->paragraph(),
            'pinned' => false,
            'target_roles' => null,
            'publish_at' => now()->subHour(),
        ];
    }
}
