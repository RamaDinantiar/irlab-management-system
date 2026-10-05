<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Tahap timeline rekrutmen (FR-APR-03-1).
 *
 * @property int $id
 * @property int $program_id
 * @property int $order
 * @property string $name
 * @property Carbon|null $start_at
 * @property Carbon|null $end_at
 */
class ProgramStage extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['start_at' => 'date', 'end_at' => 'date'];
    }

    /**
     * @return BelongsTo<Program, $this>
     */
    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class);
    }
}
