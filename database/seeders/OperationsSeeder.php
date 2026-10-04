<?php

namespace Database\Seeders;

use App\Actions\Honor\ComputeHonorRecaps;
use App\Actions\Shift\GenerateClassShifts;
use App\Models\Attendance;
use App\Models\HonorRate;
use App\Models\HonorRecap;
use App\Models\Meeting;
use App\Models\Room;
use App\Models\Semester;
use App\Models\Shift;
use App\Models\ShiftSwap;
use App\Models\SupervisionReport;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

/**
 * Shift (dari jadwal kelas + jaga lab), laporan ngawas berbagai status,
 * tukar shift, tarif & rekap honor — agar Schedule/Report/Generate terisi.
 */
class OperationsSeeder extends Seeder
{
    private const NOTES = [
        'Praktikum berjalan lancar. Asisten menjelaskan materi lalu praktikan mengerjakan latihan terbimbing; seluruh PC berfungsi normal.',
        'Perkuliahan dilaksanakan offline di lab. Dosen hadir dan menjelaskan konsep, dilanjutkan pengerjaan post-test oleh praktikan.',
        'Dua PC (PC-12 & PC-27) gagal booting, praktikan dipindahkan ke PC cadangan. Sisa sesi berjalan normal.',
        'Proyektor sempat mati 10 menit; materi dilanjutkan melalui layar PC asisten. Praktikan menyelesaikan latihan tepat waktu.',
    ];

    public function run(GenerateClassShifts $generate, ComputeHonorRecaps $honor): void
    {
        $semester = Semester::current();
        $admin = User::where('email', 'admin@irlab.test')->first();
        $dimas = User::where('email', 'asisten@irlab.test')->first();
        $michael = User::where('email', 'michael@irlab.test')->first();
        $yozika = User::where('email', 'yozika@irlab.test')->first();
        $today = CarbonImmutable::today();

        HonorRate::create(['rate_per_hour' => 22500, 'effective_from' => $semester->start_date, 'set_by' => $admin->id]);
        HonorRate::create(['rate_per_hour' => 25000, 'effective_from' => $today->startOfMonth()->toDateString(), 'set_by' => $admin->id]);

        $generate($semester);

        // Shift jaga lab mingguan (di luar sesi kelas).
        $lab1 = Room::where('name', 'Lab IR 1')->first();
        $lab2 = Room::where('name', 'Lab IR 2')->first();
        $start = CarbonImmutable::parse($semester->start_date)->startOfWeek();
        foreach ([[$dimas, 3, '13:00', '16:00', $lab1], [$yozika, 6, '08:00', '12:00', $lab2], [$michael, 4, '15:00', '17:00', $lab2]] as [$user, $day, $from, $to, $room]) {
            for ($week = 0; $week < 16; $week++) {
                $date = $start->addWeeks($week)->addDays($day - 1);
                if (! Shift::overlaps($user->id, $date->toDateString(), $from, $to)) {
                    Shift::create(['semester_id' => $semester->id, 'user_id' => $user->id, 'room_id' => $room->id, 'title' => 'Jaga Lab', 'date' => $date->toDateString(), 'start_time' => $from, 'end_time' => $to]);
                }
            }
        }

        // Laporan untuk shift yang sudah lewat. Shift kemarin & hari ini sengaja dibiarkan kosong (auto-fill).
        $shifts = Shift::whereDate('date', '<', $today->subDay()->toDateString())->with(['labClass.assistants', 'labClass.course'])->orderBy('date')->get();
        foreach ($shifts as $i => $shift) {
            // Satu laporan per sesi kelas (dibuat asisten pertama); jaga lab per orang.
            if ($shift->class_id && $shift->labClass->assistants->first()?->id !== $shift->user_id) {
                continue;
            }

            $age = $today->diffInDays($shift->date, true);
            $status = match (true) {
                $age > 4 => 'verified',
                $i % 7 === 0 => 'returned',
                $i % 3 === 0 => 'draft',
                default => 'submitted',
            };
            $verifier = $shift->user_id === $dimas->id ? $admin : $dimas;
            $meeting = $shift->class_id ? Meeting::where('class_id', $shift->class_id)->whereDate('date', $shift->date)->first() : null;
            $present = $meeting ? Attendance::where('meeting_id', $meeting->id)->where('status', 'hadir')->count() : 0;

            $report = SupervisionReport::create([
                'semester_id' => $semester->id,
                'shift_id' => $shift->id,
                'user_id' => $shift->user_id,
                'class_id' => $shift->class_id,
                'room_id' => $shift->room_id,
                'date' => $shift->date->toDateString(),
                'start_time' => $shift->start_time,
                'end_time' => $shift->end_time,
                'activity' => $shift->displayTitle(),
                'material' => $meeting ? preg_replace('/^Modul \d+ · /', '', $meeting->module_title) : 'Pemeliharaan & jaga lab',
                'present_count' => $present,
                'lab_condition' => $i % 5 === 2 ? 'kendala_ringan' : 'baik',
                'notes' => self::NOTES[$i % count(self::NOTES)],
                'status' => $status,
                'submitted_at' => $status === 'draft' ? null : $shift->endsAt()->addMinutes(30),
                'verified_by' => in_array($status, ['verified', 'returned'], true) ? $verifier->id : null,
                'verified_at' => in_array($status, ['verified', 'returned'], true) ? $shift->endsAt()->addDay() : null,
                'return_note' => $status === 'returned' ? 'Jumlah praktikan hadir belum sesuai presensi. Mohon dicek ulang.' : null,
                'editable_until' => $status === 'returned' ? $today->addDay()->endOfDay() : $shift->date->addDay()->endOfDay(),
                'created_at' => $shift->endsAt()->addMinutes(20),
            ]);

            $team = $shift->class_id ? $shift->labClass->assistants->pluck('id')->take(4)->all() : [$shift->user_id];
            $report->assistants()->sync(collect($team)->mapWithKeys(fn ($id, $p) => [$id => ['position' => $p + 1]])->all());
        }

        // Tukar shift: satu masuk untuk Dimas, satu riwayat disetujui.
        $future = Shift::where('user_id', $yozika->id)->whereDate('date', '>', $today->addDays(3)->toDateString())->whereNull('class_id')->orderBy('date')->first();
        if ($future && ! Shift::overlaps($dimas->id, $future->date->toDateString(), $future->start_time, $future->end_time)) {
            ShiftSwap::create(['shift_id' => $future->id, 'from_user_id' => $yozika->id, 'to_user_id' => $dimas->id, 'reason' => 'Bentrok jadwal seminar proposal skripsi.']);
        }
        $past = Shift::where('user_id', $dimas->id)->whereNull('class_id')->whereDate('date', '<', $today->toDateString())->orderByDesc('date')->first();
        if ($past) {
            ShiftSwap::create(['shift_id' => $past->id, 'from_user_id' => $michael->id, 'to_user_id' => $dimas->id, 'reason' => 'Izin sakit.', 'status' => 'approved', 'responded_at' => $past->date->subDays(2)]);
        }

        // Rekap honor: bulan lalu Final (disetujui Bendahara), bulan ini Draft.
        $previous = $today->subMonth()->format('Y-m');
        $honor($previous);
        HonorRecap::where('month', $previous)->update(['status' => 'final', 'approved_by' => $yozika->id, 'approved_at' => $today->startOfMonth()->addDays(1)]);
        $honor($today->format('Y-m'));
    }
}
