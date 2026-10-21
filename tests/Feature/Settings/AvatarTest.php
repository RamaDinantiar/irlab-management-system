<?php

namespace Tests\Feature\Settings;

use App\Models\StoredFile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Foto profil (Pengaturan Akun › Profil) & nomor HP.
 */
class AvatarTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('lab');
    }

    public function test_users_upload_replace_and_remove_their_photo()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('avatar.update'), ['avatar' => UploadedFile::fake()->image('foto.jpg')])
            ->assertSessionHasNoErrors()->assertRedirect(route('profile.edit'));
        $first = $user->refresh()->avatarFile;
        $this->assertNotNull($first);
        $this->assertStringContainsString('/avatars/'.$user->id, $user->avatar);

        $this->actingAs($user)->post(route('avatar.update'), ['avatar' => UploadedFile::fake()->image('baru.png')])->assertSessionHasNoErrors();
        $this->assertNotSame($first->id, $user->refresh()->avatar_file_id);
        $this->assertNull(StoredFile::find($first->id));

        $this->actingAs($user)->delete(route('avatar.destroy'))->assertRedirect(route('profile.edit'));
        $this->assertNull($user->refresh()->avatar_file_id);
        $this->assertSame(0, StoredFile::count());
    }

    public function test_only_small_images_are_accepted()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('avatar.update'), ['avatar' => UploadedFile::fake()->create('cv.pdf', 10, 'application/pdf')])
            ->assertSessionHasErrors('avatar');
        $this->actingAs($user)->post(route('avatar.update'), ['avatar' => UploadedFile::fake()->image('besar.jpg')->size(3000)])
            ->assertSessionHasErrors('avatar');
        $this->assertNull($user->refresh()->avatar_file_id);
    }

    public function test_photos_are_served_to_signed_in_users_only()
    {
        $user = User::factory()->create();
        $this->actingAs($user)->post(route('avatar.update'), ['avatar' => UploadedFile::fake()->image('foto.jpg')]);

        $this->actingAs(User::factory()->asisten()->create())->get(route('avatars.show', $user))->assertOk();
        $this->actingAs(User::factory()->create())->get(route('avatars.show', User::factory()->create()))->assertNotFound();

        auth()->logout();
        $this->get(route('avatars.show', $user))->assertRedirect(route('login'));
    }

    public function test_the_phone_number_is_normalized_and_validated_on_the_profile()
    {
        $user = User::factory()->create();

        $this->actingAs($user)->patch(route('profile.update'), ['name' => $user->name, 'email' => $user->email, 'phone' => '+62 812 3456 7890'])
            ->assertSessionHasNoErrors();
        $this->assertSame('+6281234567890', $user->refresh()->phone);

        $this->actingAs($user)->patch(route('profile.update'), ['name' => $user->name, 'email' => $user->email, 'phone' => '12345'])
            ->assertSessionHasErrors('phone');
    }
}
