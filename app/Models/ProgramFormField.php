<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Field form pendaftaran program (FR-APR-03-3, FR-PP-02).
 *
 * @property int $id
 * @property int $program_id
 * @property int $order
 * @property string $label
 * @property string $type
 * @property bool $required
 * @property list<string>|null $options
 * @property array{formats?: list<string>, max_mb?: int}|null $rules_json
 */
class ProgramFormField extends Model
{
    public const TYPES = ['text', 'textarea', 'number', 'select', 'file'];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['required' => 'boolean', 'options' => 'array', 'rules_json' => 'array'];
    }
}
