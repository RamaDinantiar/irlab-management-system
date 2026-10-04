<?php

namespace App\Concerns;

use App\Enums\ApprovalStatus;
use App\Models\LabClass;
use App\Models\Room;
use App\Support\ClassDays;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Aturan Kelas & Jadwal (US-A01-1, US-D02-3):
 *  - ruang yang sama pada hari & jam yang tumpang tindih → DITOLAK;
 *  - asisten pengampu yang jadwalnya bentrok → PERINGATAN, bisa disimpan
 *    dengan `confirm_conflicts=1`.
 */
trait ClassValidationRules
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    protected function classRules(int $semesterId, ?int $ignoreClassId = null): array
    {
        return [
            'course_id' => ['required', 'integer', Rule::exists('courses', 'id')
                ->where('semester_id', $semesterId)
                ->where('approval_status', ApprovalStatus::Approved->value)],
            'name' => ['required', 'string', 'max:50',
                Rule::unique('classes', 'name')->where('course_id', $this->integer('course_id'))->ignore($ignoreClassId)],
            'day_of_week' => ['required', 'integer', 'between:1,7'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'room_id' => ['required', 'integer', 'exists:rooms,id'],
            'quota' => ['required', 'integer', 'between:1,200'],
            'confirm_conflicts' => ['boolean'],
        ];
    }

    /**
     * @param  list<int>  $assistantIds
     * @return callable(Validator): void
     */
    protected function scheduleConflicts(int $semesterId, array $assistantIds, ?int $ignoreClassId = null): callable
    {
        return function (Validator $validator) use ($semesterId, $assistantIds, $ignoreClassId) {
            if ($validator->errors()->hasAny(['day_of_week', 'start_time', 'end_time', 'room_id'])) {
                return;
            }

            $day = $this->integer('day_of_week');
            $start = (string) $this->input('start_time');
            $end = (string) $this->input('end_time');

            $overlapping = fn () => LabClass::forSemester($semesterId)
                ->overlapping($day, $start, $end)
                ->when($ignoreClassId, fn ($query) => $query->whereKeyNot($ignoreClassId))
                ->with('course');

            $roomClash = $overlapping()->where('room_id', $this->integer('room_id'))->first();

            if ($roomClash) {
                $room = Room::find($this->integer('room_id'))?->name;
                $validator->errors()->add('room_id', sprintf(
                    '%s sudah dipakai %s · %s pada %s %s–%s.',
                    $room, $roomClash->course->name, $roomClash->name,
                    ClassDays::NAMES[$day], $roomClash->startClock(), $roomClash->endClock(),
                ));

                return;
            }

            if ($assistantIds === [] || $this->boolean('confirm_conflicts')) {
                return;
            }

            $clashes = $overlapping()
                ->whereHas('assistants', fn ($query) => $query->whereIn('users.id', $assistantIds))
                ->with('assistants')
                ->get();

            if ($clashes->isNotEmpty()) {
                $details = $clashes->map(fn (LabClass $class) => sprintf(
                    '%s (%s · %s %s–%s)',
                    $class->assistants->whereIn('id', $assistantIds)->pluck('name')->join(', '),
                    $class->course->name, $class->name, $class->startClock(), $class->endClock(),
                ))->join('; ');

                $validator->errors()->add('assistant_conflict', "Jadwal asisten bentrok: {$details}. Centang konfirmasi untuk tetap menyimpan.");
            }
        };
    }

    /**
     * @return array<string, string>
     */
    protected function classAttributes(): array
    {
        return [
            'course_id' => 'mata kuliah',
            'name' => 'nama kelas',
            'day_of_week' => 'hari',
            'start_time' => 'jam mulai',
            'end_time' => 'jam selesai',
            'room_id' => 'ruang',
            'quota' => 'kuota',
            'assistant_ids' => 'asisten pengampu',
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function classMessages(): array
    {
        return [
            'end_time.after' => 'Jam selesai harus setelah jam mulai.',
            'course_id.exists' => 'Pilih mata kuliah yang sudah disetujui pada semester ini.',
            'name.unique' => 'Nama kelas sudah dipakai untuk mata kuliah ini.',
        ];
    }
}
