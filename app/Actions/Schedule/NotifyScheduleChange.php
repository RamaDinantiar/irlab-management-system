<?php

namespace App\Actions\Schedule;

use App\Enums\ApprovalStatus;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Support\ClassDays;
use App\Support\Notifications\Notify;

/**
 * FR-PS-04: perubahan jadwal (hari/jam/ruang kelas, tanggal atau asisten
 * pengawas pertemuan) dikirim sebagai notifikasi in-app ke praktikan kelas.
 * Dipanggil setelah model disimpan (membandingkan nilai sebelumnya).
 */
class NotifyScheduleChange
{
    private const CLASS_FIELDS = ['day_of_week', 'start_time', 'end_time', 'room_id'];

    private const MEETING_FIELDS = ['date', 'responsible_assistant_id'];

    public function forClass(LabClass $class): void
    {
        if ($class->approval_status !== ApprovalStatus::Approved || $this->changed($class, self::CLASS_FIELDS) === []) {
            return;
        }

        $class->loadMissing(['course', 'room']);
        $when = ClassDays::NAMES[$class->day_of_week].', '.substr($class->start_time, 0, 5).'–'.substr($class->end_time, 0, 5);

        Notify::send(
            $this->students($class),
            'class',
            'Jadwal kelas berubah',
            "{$class->course->name} · {$class->name} kini {$when} WIB · {$class->room->name}.",
            '/praktikan/schedule',
        );
    }

    public function forMeeting(Meeting $meeting): void
    {
        $changed = $this->changed($meeting, self::MEETING_FIELDS);

        if ($changed === [] || $meeting->ended_at) {
            return;
        }

        $meeting->loadMissing(['labClass.course', 'responsibleAssistant']);
        $class = $meeting->labClass;

        $changes = [];
        if (in_array('date', $changed, true)) {
            $changes[] = 'tanggal kini '.$meeting->date->translatedFormat('l, d M Y');
        }
        if (in_array('responsible_assistant_id', $changed, true)) {
            $changes[] = 'asisten penanggung jawab kini '.($meeting->responsibleAssistant->name ?? 'belum ditentukan');
        }

        Notify::send(
            $this->students($class),
            'class',
            "Pertemuan {$meeting->number} berubah",
            "{$class->course->name} · {$class->name}: ".implode('; ', $changes).'.',
            '/praktikan/schedule',
        );
    }

    /**
     * Jam "13:00" dan "13:00:00" dianggap sama agar simpan ulang tanpa
     * perubahan tidak memicu notifikasi.
     *
     * @param  list<string>  $fields
     * @return list<string> kolom yang benar-benar berubah
     */
    private function changed(LabClass|Meeting $model, array $fields): array
    {
        $previous = $model->getPrevious();

        return array_values(array_filter($fields, fn (string $field) => $model->wasChanged($field)
            && $this->normalize($previous[$field] ?? null) !== $this->normalize($model->getRawOriginal($field))));
    }

    private function normalize(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = (string) $value;

        return preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $value) ? substr($value, 0, 5) : substr($value, 0, 10);
    }

    /**
     * @return array<int, int>
     */
    private function students(LabClass $class): array
    {
        return $class->enrollments()->pluck('user_id')->map(fn ($id) => (int) $id)->all();
    }
}
