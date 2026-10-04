<?php

namespace App\Actions\Shift;

use App\Enums\ApprovalStatus;
use App\Models\AuditLog;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Semester;
use App\Models\Shift;

/**
 * Shift sesi praktikum dibuat dari pertemuan kelas: satu shift per asisten
 * pengampu per pertemuan. Idempoten — shift yang sudah ada tidak diduplikasi.
 */
class GenerateClassShifts
{
    public function __invoke(Semester $semester): int
    {
        $created = 0;

        LabClass::forSemester($semester)->where('approval_status', ApprovalStatus::Approved)
            ->with(['meetings', 'assistants'])->get()
            ->each(function (LabClass $class) use ($semester, &$created) {
                $class->meetings->each(function (Meeting $meeting) use ($class, $semester, &$created) {
                    foreach ($class->assistants as $assistant) {
                        $shift = Shift::firstOrCreate(
                            ['class_id' => $class->id, 'user_id' => $assistant->id, 'date' => $meeting->date->toDateString()],
                            ['semester_id' => $semester->id, 'room_id' => $class->room_id, 'start_time' => $class->start_time, 'end_time' => $class->end_time],
                        );
                        $created += $shift->wasRecentlyCreated ? 1 : 0;
                    }
                });
            });

        AuditLog::record('shift.generated', $semester, null, ['created' => $created]);

        return $created;
    }
}
