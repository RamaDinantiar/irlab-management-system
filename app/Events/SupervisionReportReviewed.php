<?php

namespace App\Events;

use App\Models\SupervisionReport;
use Illuminate\Foundation\Events\Dispatchable;

class SupervisionReportReviewed
{
    use Dispatchable;

    public function __construct(public readonly SupervisionReport $report) {}
}
