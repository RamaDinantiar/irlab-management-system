<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Tahap timeline rekrutmen (FR-APR-03-1).
 *
 * @property int $id
 * @property int $program_id
 * @property int $order
 * @property string $name
 * @property CarbonImmutable|null $start_at
 * @property CarbonImmutable|null $end_at
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
