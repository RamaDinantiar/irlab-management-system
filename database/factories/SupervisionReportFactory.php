<?php

namespace Database\Factories;

use App\Models\Semester;
use App\Models\SupervisionReport;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SupervisionReport>
 */
class SupervisionReportFactory extends Factory
{
    public function definition(): array
    {
        return [
            'semester_id' => Semester::factory(),
            'user_id' => User::factory()->asisten(),
            'date' => now()->toDateString(),
            'start_time' => '13:00',
            'end_time' => '16:00',
            'activity' => 'Jaga Lab',
            'material' => 'Pemeliharaan',
            'present_count' => 20,
            'lab_condition' => 'baik',
            'notes' => 'Kegiatan berjalan lancar.',
            'status' => 'draft',
            'editable_until' => now()->addDay()->endOfDay(),
        ];
    }
}
