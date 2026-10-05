<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\LabClass;
use App\Models\Meeting;
use App\Models\Program;
use App\Models\Room;
use App\Models\Semester;
use App\Models\TaskTarget;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Pencarian global topbar (PRD 4.x): sesuai peran — Praktikan mencari
 * tugas/modul, Asisten mencari praktikan/tugas, Admin semua entitas.
 */
class SearchController extends Controller
{
    private const LIMIT = 5;

    public function __invoke(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q'));
        if (mb_strlen($q) < 2) {
            return response()->json([]);
        }

        $user = $request->user();
        $like = '%'.str_replace(['%', '_'], ['\\%', '\\_'], $q).'%';
        $semester = Semester::current();

        $groups = match ($user->role) {
            Role::Praktikan => [
                'Tugas' => $this->studentTasks($user, $like),
                'Modul' => $this->modules(Enrollment::where('user_id', $user->id)->select('class_id'), $like, '/praktikan/schedule'),
                'Program' => $this->programs($like, '/praktikan/programs/'),
            ],
            Role::Asisten => [
                'Praktikan' => $this->students(LabClass::taughtBy($user)->select('id'), $like),
                'Tugas' => $this->staffTasks($user, $like),
                'Kelas' => $this->classes($user, $like, $semester),
                'Program' => $this->programs($like, '/asisten/programs/'),
            ],
            Role::Admin => [
                'Pengguna' => User::where(fn ($w) => $w->where('name', 'like', $like)->orWhere('nim', 'like', $like)->orWhere('email', 'like', $like))
                    ->limit(self::LIMIT)->get()
                    ->map(fn (User $u) => ['title' => $u->name, 'subtitle' => trim(($u->nim ?? '').' · '.$u->role->value, ' ·'), 'href' => '/admin/users?search='.urlencode($u->nim ?? $u->email)]),
                'Kelas' => $this->classes($user, $like, $semester),
                'Mata Kuliah' => Course::where(fn ($w) => $w->where('name', 'like', $like)->orWhere('code', 'like', $like))
                    ->when($semester, fn ($w) => $w->where('semester_id', $semester->id))->limit(self::LIMIT)->get()
                    ->map(fn (Course $c) => ['title' => $c->name, 'subtitle' => $c->code, 'href' => '/admin/courses']),
                'Tugas' => $this->staffTasks($user, $like),
                'Ruang' => Room::where('name', 'like', $like)->limit(self::LIMIT)->get()
                    ->map(fn (Room $r) => ['title' => $r->name, 'subtitle' => "Grid {$r->rows}×{$r->cols}", 'href' => "/admin/rooms/{$r->id}/layout"]),
                'Program' => $this->programs($like, '/asisten/programs/'),
            ],
        };

        return response()->json(collect($groups)
            ->map(fn ($items, $label) => ['label' => $label, 'items' => collect($items)->values()])
            ->filter(fn ($g) => $g['items']->isNotEmpty())->values());
    }

    private function studentTasks(User $user, string $like)
    {
        return TaskTarget::whereIn('class_id', Enrollment::where('user_id', $user->id)->select('class_id'))
            ->whereNotNull('open_at')->where('open_at', '<=', now())
            ->whereHas('task', fn ($q) => $q->where('status', 'published')->where('title', 'like', $like))
            ->with(['task', 'labClass.course'])->latest('due_at')->limit(self::LIMIT)->get()
            ->map(fn (TaskTarget $t) => ['title' => $t->task->title, 'subtitle' => "{$t->labClass->course->name} · {$t->labClass->name}", 'href' => "/praktikan/tasks/{$t->id}"]);
    }

    private function staffTasks(User $user, string $like)
    {
        return TaskTarget::whereIn('class_id', LabClass::taughtBy($user)->select('id'))
            ->whereHas('task', fn ($q) => $q->where('title', 'like', $like))
            ->with(['task', 'labClass.course'])->latest('id')->limit(self::LIMIT)->get()
            ->map(fn (TaskTarget $t) => ['title' => $t->task->title, 'subtitle' => "{$t->labClass->course->name} · {$t->labClass->name}", 'href' => "/asisten/tasks/{$t->task_id}/edit"]);
    }

    private function modules($classIds, string $like, string $href)
    {
        return Meeting::whereIn('class_id', $classIds)->where('module_title', 'like', $like)
            ->where(fn ($q) => $q->whereNull('module_release_at')->orWhere('module_release_at', '<=', now()))
            ->with('labClass.course')->orderBy('date')->limit(self::LIMIT)->get()
            ->map(fn (Meeting $m) => ['title' => $m->module_title, 'subtitle' => "{$m->labClass->course->name} · Pertemuan {$m->number}", 'href' => $href]);
    }

    private function students($classIds, string $like)
    {
        return Enrollment::whereIn('class_id', $classIds)
            ->whereHas('user', fn ($q) => $q->where('name', 'like', $like)->orWhere('nim', 'like', $like))
            ->with(['user:id,name,nim', 'labClass.course'])->limit(self::LIMIT)->get()
            ->map(fn (Enrollment $e) => ['title' => $e->user->name, 'subtitle' => "{$e->user->nim} · {$e->labClass->course->name} {$e->labClass->name}", 'href' => "/asisten/class/{$e->class_id}"]);
    }

    private function classes(User $user, string $like, ?Semester $semester)
    {
        return LabClass::taughtBy($user)->when($semester, fn ($q) => $q->where('semester_id', $semester->id))
            ->where(fn ($q) => $q->where('name', 'like', $like)->orWhereHas('course', fn ($c) => $c->where('name', 'like', $like)->orWhere('code', 'like', $like)))
            ->with('course')->limit(self::LIMIT)->get()
            ->map(fn (LabClass $c) => ['title' => "{$c->course->name} · {$c->name}", 'subtitle' => $c->course->code, 'href' => "/asisten/class/{$c->id}"]);
    }

    private function programs(string $like, string $base)
    {
        return Program::where('type', '!=', 'maintenance')->where('title', 'like', $like)
            ->when(str_starts_with($base, '/praktikan'), fn ($q) => $q->catalog())
            ->latest('id')->limit(self::LIMIT)->get()
            ->map(fn (Program $p) => ['title' => $p->title, 'subtitle' => $p->type->label(), 'href' => $base.$p->id]);
    }
}
