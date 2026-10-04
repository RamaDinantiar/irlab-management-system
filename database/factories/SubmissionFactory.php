<?php

namespace Database\Factories;

use App\Models\Submission;
use App\Models\TaskTarget;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Submission>
 */
class SubmissionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'task_target_id' => TaskTarget::factory(),
            'user_id' => User::factory(),
            'text_answer' => 'Jawaban saya.',
            'submitted_at' => now(),
            'version' => 1,
            'is_current' => true,
        ];
    }
}
