<?php

namespace Database\Factories;

use App\Enums\TaskType;
use App\Models\Course;
use App\Models\Task;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    public function definition(): array
    {
        return [
            'course_id' => Course::factory(),
            'semester_id' => fn (array $attributes) => Course::whereKey($attributes['course_id'])->firstOrFail()->semester_id,
            'type' => TaskType::Posttest,
            'title' => 'Post-Test Pertemuan '.fake()->numberBetween(1, 8),
            'body_json' => ['type' => 'doc', 'content' => [['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => 'Kerjakan soal berikut.']]]]],
            'max_score' => 100,
            'allow_late' => false,
            'allowed_formats' => ['pdf', 'zip'],
            'text_answer' => 'optional',
            'status' => 'published',
        ];
    }

    public function draft(): static
    {
        return $this->state(fn () => ['status' => 'draft']);
    }
}
