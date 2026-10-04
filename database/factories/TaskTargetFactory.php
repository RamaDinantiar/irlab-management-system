<?php

namespace Database\Factories;

use App\Models\LabClass;
use App\Models\Task;
use App\Models\TaskTarget;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaskTarget>
 */
class TaskTargetFactory extends Factory
{
    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),
            'class_id' => LabClass::factory(),
            'open_at' => now()->subHour(),
            'due_at' => now()->addDays(2),
            'published_at' => now()->subHour(),
        ];
    }
}
