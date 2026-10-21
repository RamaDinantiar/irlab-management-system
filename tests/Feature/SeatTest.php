<?php

namespace Tests\Feature;

use App\Actions\Seat\ContractSeat;
use App\Events\SeatContractChanged;
use App\Models\AuditLog;
use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\Room;
use App\Models\Seat;
use App\Models\SeatContract;
use App\Models\Semester;
use App\Models\User;
use App\Support\Seats\RoomLayout;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * US-P04, US-D03, FR-PST, FR-ADM-05/06 — Seats.
 */
class SeatTest extends TestCase
{
    use RefreshDatabase;

    private Room $room;

    private LabClass $class;

    private User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->room = Room::factory()->create(['rows' => 6, 'cols' => 8]);
        $this->room->seats()->createMany(RoomLayout::defaultCells(6, 8));
        $semester = Semester::factory()->active()->create();
        $this->class = LabClass::factory()->create(['semester_id' => $semester->id, 'room_id' => $this->room->id, 'seat_contract_open' => true]);
        $this->class->course->forceFill(['semester_id' => $semester->id])->save();
        $this->student = Enrollment::factory()->for($this->class, 'labClass')->create()->user;
    }

    private function seat(string $label): Seat
    {
        return $this->room->seats()->where('label', $label)->sole();
    }

    private function contract(User $user, string $label)
    {
        return $this->actingAs($user)->post(route('praktikan.seats.store', $this->class), ['seat_id' => $this->seat($label)->id, 'agreement' => '1']);
    }

    public function test_the_default_layout_matches_the_figma_room()
    {
        $this->assertSame(40, $this->room->seats()->where('type', 'seat')->count());
        $this->assertSame(1, $this->room->seats()->where('type', 'assistant_desk')->count());
        // Penomoran berkelok: baris 1 kanan→kiri, baris 2 kiri→kanan.
        $this->assertSame([1, 8], [$this->seat('PC-01')->row, $this->seat('PC-01')->col]);
        $this->assertSame([1, 2], [$this->seat('PC-06')->row, $this->seat('PC-06')->col]);
        $this->assertSame([2, 2], [$this->seat('PC-07')->row, $this->seat('PC-07')->col]);
        $this->assertSame([3, 1], [$this->seat('PC-19')->row, $this->seat('PC-19')->col]);
    }

    public function test_a_student_contracts_a_seat_with_a_profile_snapshot()
    {
        $this->contract($this->student, 'PC-12')->assertSessionHasNoErrors()->assertRedirect(route('praktikan.seats.index', ['class' => $this->class->id]));

        $contract = SeatContract::sole();
        $this->assertSame($this->seat('PC-12')->id, $contract->seat_id);
        $this->assertSame($this->student->nim, $contract->snapshot_nim);
        $this->assertSame($this->student->major, $contract->snapshot_major);
        $this->assertTrue(AuditLog::where('action', 'seat.contracted')->exists());

        $this->get(route('praktikan.seats.index'))->assertInertia(fn (Assert $page) => $page
            ->component('praktikan/seats/index')
            ->where('classes.0.seat', 'PC-12')
            ->where('map.occupants.0.mine', true));
    }

    public function test_a_taken_seat_is_rejected_with_a_clear_message()
    {
        $other = Enrollment::factory()->for($this->class, 'labClass')->create()->user;
        $this->contract($other, 'PC-12');

        $this->contract($this->student, 'PC-12')->assertSessionHasErrors(['seat_id' => ContractSeat::TAKEN]);
        $this->assertSame(1, SeatContract::count());
    }

    public function test_the_database_enforces_one_seat_and_one_student_per_class()
    {
        SeatContract::factory()->create(['class_id' => $this->class->id, 'seat_id' => $this->seat('PC-01')->id, 'user_id' => $this->student->id]);

        $this->expectException(UniqueConstraintViolationException::class);
        SeatContract::factory()->create(['class_id' => $this->class->id, 'seat_id' => $this->seat('PC-01')->id]);
    }

    public function test_students_cannot_change_their_own_contract()
    {
        $this->contract($this->student, 'PC-01');

        $this->contract($this->student, 'PC-02')->assertSessionHasErrors('seat_id');
        $this->assertSame($this->seat('PC-01')->id, SeatContract::sole()->seat_id);
    }

    public function test_contracts_require_an_open_period_a_complete_profile_and_membership()
    {
        $this->class->forceFill(['seat_contract_open' => false])->save();
        $this->contract($this->student, 'PC-01')->assertSessionHasErrors('seat_id');

        $this->class->forceFill(['seat_contract_open' => true])->save();
        $this->student->forceFill(['major' => null])->save();
        $this->contract($this->student, 'PC-01')->assertSessionHasErrors('seat_id');

        $this->contract(User::factory()->create(), 'PC-01')->assertForbidden();
        $this->assertSame(0, SeatContract::count());
    }

    public function test_seats_of_other_rooms_and_non_seat_cells_are_rejected()
    {
        $foreign = Seat::factory()->create();
        $desk = $this->room->seats()->where('type', 'assistant_desk')->sole();

        foreach ([$foreign, $desk] as $seat) {
            $this->actingAs($this->student)->post(route('praktikan.seats.store', $this->class), ['seat_id' => $seat->id, 'agreement' => '1'])
                ->assertSessionHasErrors('seat_id');
        }
    }

    public function test_the_agreement_must_be_accepted()
    {
        $this->actingAs($this->student)->post(route('praktikan.seats.store', $this->class), ['seat_id' => $this->seat('PC-01')->id])
            ->assertSessionHasErrors('agreement');
    }

    public function test_admins_move_and_cancel_contracts_with_a_reason()
    {
        Event::fake([SeatContractChanged::class]);
        $contract = SeatContract::factory()->create(['class_id' => $this->class->id, 'seat_id' => $this->seat('PC-01')->id, 'user_id' => $this->student->id]);
        $this->actingAs(User::factory()->admin()->create());

        $this->put(route('admin.seat-contracts.update', $contract), ['seat_id' => $this->seat('PC-05')->id])->assertSessionHasErrors('reason');

        $this->put(route('admin.seat-contracts.update', $contract), ['seat_id' => $this->seat('PC-05')->id, 'reason' => 'PC-01 rusak'])->assertSessionHasNoErrors();
        $this->assertSame($this->seat('PC-05')->id, $contract->fresh()->seat_id);
        $log = AuditLog::where('action', 'seat.moved')->sole();
        $this->assertSame('PC-01', $log->before_json['seat']);
        $this->assertSame('PC-05', $log->after_json['seat']);

        $this->delete(route('admin.seat-contracts.destroy', $contract), ['reason' => 'Salah kelas'])->assertSessionHasNoErrors();
        $this->assertSame(0, SeatContract::count());
        Event::assertDispatchedTimes(SeatContractChanged::class, 2);
    }

    public function test_admins_cannot_move_onto_an_occupied_seat()
    {
        $contract = SeatContract::factory()->create(['class_id' => $this->class->id, 'seat_id' => $this->seat('PC-01')->id, 'user_id' => $this->student->id]);
        SeatContract::factory()->create(['class_id' => $this->class->id, 'seat_id' => $this->seat('PC-02')->id]);

        $this->actingAs(User::factory()->admin()->create())
            ->put(route('admin.seat-contracts.update', $contract), ['seat_id' => $this->seat('PC-02')->id, 'reason' => 'Coba pindah'])
            ->assertSessionHasErrors('seat_id');
    }

    public function test_saving_a_layout_keeps_contracted_seats_and_blocks_removing_them()
    {
        $pc1 = $this->seat('PC-01');
        SeatContract::factory()->create(['class_id' => $this->class->id, 'seat_id' => $pc1->id, 'user_id' => $this->student->id]);
        $this->actingAs(User::factory()->admin()->create());

        $cells = fn (array $override) => collect(RoomLayout::defaultCells(6, 8))->map(fn ($c) => array_merge($c, $override["{$c['row']}:{$c['col']}"] ?? []))->all();

        // Ubah label saja → id kursi (dan kontraknya) tetap.
        $this->put(route('admin.rooms.layout.update', $this->room), ['cells' => $cells(['1:8' => ['label' => 'PC-99']])])->assertSessionHasNoErrors();
        $this->assertSame('PC-99', $pc1->fresh()->label);
        $this->assertSame($pc1->id, SeatContract::sole()->seat_id);

        // Menjadikan kursi terkontrak nonaktif ditolak.
        $this->put(route('admin.rooms.layout.update', $this->room), ['cells' => $cells(['1:8' => ['type' => 'disabled', 'label' => null]])])->assertSessionHasErrors('cells');
        $this->assertSame('seat', $pc1->fresh()->type);
    }

    public function test_duplicate_labels_are_rejected()
    {
        $cells = RoomLayout::defaultCells(6, 8);
        $cells[1]['label'] = $cells[2]['label'];

        $this->actingAs(User::factory()->admin()->create())
            ->put(route('admin.rooms.layout.update', $this->room), ['cells' => $cells])
            ->assertSessionHasErrors('cells.2');
    }

    public function test_new_rooms_get_a_default_layout()
    {
        $this->actingAs(User::factory()->admin()->create())
            ->post(route('admin.rooms.store'), ['name' => 'Lab IR 3', 'rows' => 6, 'cols' => 8]);

        $this->assertSame(40, Room::where('name', 'Lab IR 3')->sole()->seats()->where('type', 'seat')->count());
    }

    public function test_assistants_see_seat_mapping_of_their_classes()
    {
        $asisten = User::factory()->asisten()->create();
        $this->class->assistants()->attach($asisten);
        SeatContract::factory()->create(['class_id' => $this->class->id, 'seat_id' => $this->seat('PC-03')->id, 'user_id' => $this->student->id, 'snapshot_name' => 'Rama Dinantiar']);

        $this->actingAs($asisten)->get(route('asisten.seats.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('asisten/seats')
                ->where('selected.id', $this->class->id)
                ->where('map.occupants.0.name', 'Rama Dinantiar')
                ->where('map.occupants.0.email', $this->student->email)
                ->where('map.occupants.0.phone', $this->student->phone)
                ->where('map.occupants.0.avatar', null));

        $this->actingAs(User::factory()->asisten()->create())->get(route('asisten.seats.index'))
            ->assertInertia(fn (Assert $page) => $page->where('selected', null));
    }

    public function test_removing_a_member_releases_the_seat()
    {
        $asisten = User::factory()->asisten()->create();
        $this->class->assistants()->attach($asisten);
        $enrollment = Enrollment::where('user_id', $this->student->id)->sole();
        SeatContract::factory()->create(['class_id' => $this->class->id, 'seat_id' => $this->seat('PC-03')->id, 'user_id' => $this->student->id]);

        $this->actingAs($asisten)->delete(route('asisten.classes.members.destroy', [$this->class, $enrollment]), ['reason' => 'Pindah kelas'])->assertSessionHasNoErrors();

        $this->assertSame(0, SeatContract::count());
    }
}
