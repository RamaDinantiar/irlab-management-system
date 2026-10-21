<?php

namespace Database\Seeders;

use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\Room;
use App\Models\SeatContract;
use App\Models\Semester;
use App\Support\Seats\RoomLayout;

/**
 * Denah bawaan tiap ruang + kontrak kursi contoh. Rina belum mengontrak kursi
 * di Mobile Programming (periode dibuka) agar alur "Tambah Kontrak" bisa dicoba.
 */
class SeatSeeder extends DemoSeeder
{
    public function run(): void
    {
        Room::all()->each(fn (Room $room) => $room->seats()->createMany(RoomLayout::defaultCells($room->rows, $room->cols)));

        LabClass::forSemester(Semester::current())->where('approval_status', 'approved')->with(['room.seats', 'enrollments.user', 'course'])->get()
            ->each(function (LabClass $class) {
                $class->forceFill(['seat_contract_open' => true])->save();
                $seats = $class->room->seats->where('type', 'seat')->sortBy(fn ($seat) => (int) substr($seat->label, 3))->values();

                $class->enrollments->values()->each(function (Enrollment $enrollment, int $i) use ($class, $seats) {
                    $user = $enrollment->user;
                    $skip = $user->email === 'praktikan@irlab.test' ? $class->course->code === 'IF-3205' : $i % 5 === 4;

                    if ($skip || ! isset($seats[$i])) {
                        return;
                    }

                    SeatContract::create([
                        'class_id' => $class->id,
                        // Rina di PC-01/02 dst. sesuai contoh Figma; lainnya berurutan.
                        'seat_id' => $seats[$i]->id,
                        'user_id' => $user->id,
                        'snapshot_name' => $user->name,
                        'snapshot_nim' => $user->nim,
                        'snapshot_major' => $user->major,
                    ]);
                });
            });
    }
}
