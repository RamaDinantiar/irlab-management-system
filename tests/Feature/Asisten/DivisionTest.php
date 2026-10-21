<?php

namespace Tests\Feature\Asisten;

use App\Enums\Position;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Divisi Asisten: Asisten Umum, atau Sekretaris/Bendahara (satu jabatan) yang
 * memverifikasi laporan ngawas sekaligus menyetujui rekap honor.
 */
class DivisionTest extends TestCase
{
    use RefreshDatabase;

    public function test_sekretaris_bendahara_holds_both_rights()
    {
        $umum = User::factory()->asisten()->create();
        $sekben = User::factory()->asisten(Position::SekretarisBendahara)->create();

        $this->assertSame('Asisten Umum', $umum->position->label());
        $this->assertFalse($umum->canVerifyReports());
        $this->assertFalse($umum->canApproveHonor());

        $this->assertSame('Sekretaris/Bendahara', $sekben->position->label());
        $this->assertTrue($sekben->canVerifyReports());
        $this->assertTrue($sekben->canApproveHonor());
    }

    public function test_old_positions_are_rejected()
    {
        $this->actingAs(User::factory()->admin()->create());

        foreach (['sekretaris', 'bendahara'] as $old) {
            $this->post(route('admin.users.store'), [
                'nim' => '202331099', 'name' => 'Asisten Baru', 'email' => 'baru@itpln.ac.id',
                'role' => 'asisten', 'position' => $old,
            ])->assertSessionHasErrors('position');
        }
    }
}
