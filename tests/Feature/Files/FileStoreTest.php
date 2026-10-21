<?php

namespace Tests\Feature\Files;

use App\Models\StoredFile;
use App\Models\TaskTarget;
use App\Models\User;
use App\Support\Files\FileStore;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\Support\Pdf;
use Tests\TestCase;

/**
 * PRD 8.1 — keamanan file unggahan.
 */
class FileStoreTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('lab');
    }

    private function store(UploadedFile $file, array $kinds = ['pdf', 'zip']): StoredFile
    {
        return app(FileStore::class)->store($file, $kinds, 'test', null, null);
    }

    public function test_a_pdf_is_stored_privately_under_a_uuid_with_checksum()
    {
        $file = $this->store(Pdf::upload('Laporan 04.pdf'));

        $this->assertSame('Laporan 04.pdf', $file->original_name);
        $this->assertSame('application/pdf', $file->mime);
        $this->assertMatchesRegularExpression('#^test/\d{4}/\d{2}/[0-9a-f-]{36}\.pdf$#', $file->path);
        $this->assertSame(hash('sha256', Pdf::CONTENT), $file->sha256);
        Storage::disk('lab')->assertExists($file->path);
    }

    public function test_the_real_content_type_is_checked_not_the_extension()
    {
        $this->expectException(ValidationException::class);
        $this->store(UploadedFile::fake()->createWithContent('virus.pdf', 'MZ this is not a pdf'));
    }

    public function test_size_limits_per_kind()
    {
        config(['lab.files.limits.pdf' => 1]);

        $this->expectException(ValidationException::class);
        $this->store(Pdf::upload(padKb: 2));
    }

    public function test_zip_with_path_traversal_is_rejected()
    {
        $this->expectException(ValidationException::class);
        $this->store(Pdf::zip(['../../etc/passwd' => 'x']));
    }

    public function test_zip_with_too_many_entries_is_rejected()
    {
        config(['lab.files.zip.max_entries' => 3]);

        $this->expectException(ValidationException::class);
        $this->store(Pdf::zip(['a.py' => '1', 'b.py' => '2', 'c.py' => '3', 'd.py' => '4']));
    }

    public function test_zip_bombs_are_rejected()
    {
        config(['lab.files.zip.max_uncompressed' => 1000]);

        $this->expectException(ValidationException::class);
        $this->store(Pdf::zip(['big.txt' => str_repeat('a', 5000)]));
    }

    public function test_a_valid_zip_is_accepted()
    {
        $file = $this->store(Pdf::zip(['src/main.py' => 'print("hi")', 'README.md' => '# Tugas']));

        $this->assertSame('application/zip', $file->mime);
    }

    public function test_downloads_require_a_signature_and_permission()
    {
        $target = TaskTarget::factory()->create();
        $file = app(FileStore::class)->store(Pdf::upload(), ['pdf'], 'task_attachment', $target->task, null);

        $member = User::factory()->create();
        $target->labClass->enrollments()->create(['user_id' => $member->id, 'joined_at' => now()]);
        $stranger = User::factory()->create();

        $this->actingAs($member)->get(route('files.show', $file))->assertForbidden(); // tanpa signature
        $this->actingAs($member)->get($file->url())
            ->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('Content-Disposition', 'attachment; filename=file; filename*=utf-8\'\''.rawurlencode($file->original_name));
        $this->actingAs($stranger)->get($file->url())->assertForbidden();
    }

    public function test_attachments_of_unopened_tasks_are_hidden_from_students()
    {
        $target = TaskTarget::factory()->create(['open_at' => now()->addDay()]);
        $file = app(FileStore::class)->store(Pdf::upload(), ['pdf'], 'task_attachment', $target->task, null);
        $member = User::factory()->create();
        $target->labClass->enrollments()->create(['user_id' => $member->id, 'joined_at' => now()]);

        $this->actingAs($member)->get($file->url())->assertForbidden();

        $assistant = User::factory()->asisten()->create();
        $target->task->course->assistants()->attach($assistant);
        $this->actingAs($assistant)->get($file->url())->assertOk();
    }
}
