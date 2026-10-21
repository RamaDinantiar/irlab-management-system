<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * Tim asisten jaga sebuah laporan mengawas; position 1 = penanggung jawab.
 *
 * @property int $supervision_report_id
 * @property int $user_id
 * @property int $position
 */
class SupervisionReportAssistant extends Pivot
{
    protected $table = 'supervision_report_assistants';

    protected function casts(): array
    {
        return ['position' => 'integer'];
    }
}
