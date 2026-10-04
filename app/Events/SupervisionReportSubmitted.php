<?php

namespace App\Events;

use App\Models\SupervisionReport;
use Illuminate\Foundation\Events\Dispatchable;

class SupervisionReportSubmitted
{
    use Dispatchable;

    public function __construct(public readonly SupervisionReport $report) {}
}
