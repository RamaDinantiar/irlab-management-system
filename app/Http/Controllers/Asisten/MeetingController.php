<?php

namespace App\Http\Controllers\Asisten;

use App\Http\Controllers\Asisten\Concerns\AuthorizesClassAssistant;
use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Support\Files\FileStore;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * FR-AC-04: pertemuan 1–n, unggah modul PDF, atur tanggal rilis modul.
 */
class MeetingController extends Controller
{
    use AuthorizesClassAssistant;

    /**
     * Buat pertemuan mingguan otomatis mulai hari kelas pertama di semester.
     */
    public function generate(Request $request, LabClass $class): RedirectResponse
    {
        $this->authorizeAssistant($request, $class, write: true);
        $count = (int) $request->validate(['count' => ['required', 'integer', 'between:1,20']], [], ['count' => 'jumlah pertemuan'])['count'];

        $start = CarbonImmutable::parse($class->semester->start_date);
        $first = $start->dayOfWeekIso === $class->day_of_week ? $start : $start->next($class->day_of_week % 7);
        $existing = $class->meetings()->pluck('number')->all();

        $created = 0;
        DB::transaction(function () use ($class, $count, $first, $existing, &$created) {
            for ($number = 1; $number <= $count; $number++) {
                if (in_array($number, $existing, true)) {
                    continue;
                }

                $class->meetings()->create(['number' => $number, 'date' => $first->addWeeks($number - 1)->toDateString()]);
                $created++;
            }
        });

        AuditLog::record('meeting.generated', $class, null, ['count' => $created]);
        Inertia::flash('toast', ['type' => 'success', 'message' => "{$created} pertemuan dibuat."]);

        return back();
    }

    public function store(Request $request, LabClass $class, FileStore $files): RedirectResponse
    {
        $this->authorizeAssistant($request, $class, write: true);
        $validated = $this->validated($request, $class);

        $meeting = $class->meetings()->create(collect($validated)->except('module_file')->all());
        $this->attachModule($request, $meeting, $files);

        AuditLog::record('meeting.created', $meeting, null, collect($validated)->except('module_file')->all());
        Inertia::flash('toast', ['type' => 'success', 'message' => "Pertemuan {$meeting->number} ditambahkan."]);

        return back();
    }

    public function update(Request $request, Meeting $meeting, FileStore $files): RedirectResponse
    {
        $class = $meeting->labClass;
        $this->authorizeAssistant($request, $class, write: true);
        $validated = $this->validated($request, $class, $meeting);

        $meeting->update(collect($validated)->except(['module_file', 'remove_module'])->all());

        if ($request->boolean('remove_module') && $meeting->moduleFile) {
            $old = $meeting->moduleFile;
            $meeting->update(['module_file_id' => null]);
            $old->delete();
        }

        $this->attachModule($request, $meeting, $files);

        AuditLog::record('meeting.updated', $meeting, null, collect($validated)->except('module_file')->all());
        Inertia::flash('toast', ['type' => 'success', 'message' => "Pertemuan {$meeting->number} diperbarui."]);

        return back();
    }

    public function destroy(Request $request, Meeting $meeting): RedirectResponse
    {
        $this->authorizeAssistant($request, $meeting->labClass, write: true);
        abort_if($meeting->started_at !== null, 422, 'Pertemuan yang sudah dimulai tidak dapat dihapus.');

        AuditLog::record('meeting.deleted', $meeting->labClass, ['meeting' => $meeting->number]);
        $meeting->moduleFile?->delete();
        $meeting->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => "Pertemuan {$meeting->number} dihapus."]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, LabClass $class, ?Meeting $meeting = null): array
    {
        return $request->validate([
            'number' => ['required', 'integer', 'between:1,50', Rule::unique('meetings', 'number')->where('class_id', $class->id)->ignore($meeting)],
            'date' => ['required', 'date'],
            'module_title' => ['nullable', 'string', 'max:150'],
            'module_release_at' => ['nullable', 'date'],
            'responsible_assistant_id' => ['nullable', 'integer', Rule::exists('class_assistants', 'user_id')->where('class_id', $class->id)],
            'module_file' => ['nullable', 'file'],
            'remove_module' => ['boolean'],
        ], ['number.unique' => 'Nomor pertemuan sudah ada di kelas ini.'], [
            'number' => 'nomor pertemuan', 'date' => 'tanggal', 'module_title' => 'judul modul',
            'module_release_at' => 'tanggal rilis modul', 'responsible_assistant_id' => 'asisten penanggung jawab',
        ]);
    }

    private function attachModule(Request $request, Meeting $meeting, FileStore $files): void
    {
        if (! $request->hasFile('module_file')) {
            return;
        }

        $file = $files->store($request->file('module_file'), ['pdf'], 'module', $meeting, $request->user(), 'module_file');
        $old = $meeting->moduleFile;
        $meeting->update(['module_file_id' => $file->id]);
        $old?->delete();
    }
}
