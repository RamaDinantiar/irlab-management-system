<?php

use App\Http\Controllers\Praktikan\ClassController;
use App\Http\Controllers\Praktikan\EnrollmentController;
use App\Http\Controllers\Praktikan\GradeController;
use App\Http\Controllers\Praktikan\ProgramController;
use App\Http\Controllers\Praktikan\ScheduleController;
use App\Http\Controllers\Praktikan\SeatController;
use App\Http\Controllers\Praktikan\TaskController;
use App\Http\Middleware\EnsureProgramsAvailable;
use Illuminate\Support\Facades\Route;

/*
 * Route modul Praktikan (prefix /praktikan, nama praktikan.*, middleware role:praktikan).
 * Dimuat dari routes/web.php sebelum route "Segera hadir".
 */

Route::get('class', [ClassController::class, 'index'])->name('class.index');
Route::get('schedule', [ScheduleController::class, 'index'])->name('schedule');

// US-P01-7: batas percobaan kode salah ditangani di JoinClass (5 per 10 menit).
Route::post('enrollments', [EnrollmentController::class, 'store'])->name('enrollments.store');

// FR-PT: Task & pengumpulan (US-P02).
Route::get('task/{type?}', [TaskController::class, 'index'])->where('type', 'laporan|post-test|pre-test')->name('tasks.index');
Route::get('tasks/{target}', [TaskController::class, 'show'])->name('tasks.show');
Route::post('tasks/{target}/submissions', [TaskController::class, 'submit'])->middleware('throttle:20,1')->name('tasks.submit');

// FR-PG: nilai & feedback (read-only).
Route::get('grade', [GradeController::class, 'index'])->name('grades.index');

// FR-PST: kontrak kursi (US-P04).
Route::get('seats', [SeatController::class, 'index'])->name('seats.index');
Route::get('seats/{class}/contract', [SeatController::class, 'create'])->name('seats.create');
Route::post('classes/{class}/seat-contracts', [SeatController::class, 'store'])->middleware('throttle:20,1')->name('seats.store');

// FR-PP: Program (etalase, pendaftaran, Program Saya).
Route::middleware(EnsureProgramsAvailable::class)->group(function () {
    Route::get('program/{type?}', [ProgramController::class, 'index'])->where('type', 'workshop|quick-tutor|recruitment')->name('programs.index');
    Route::get('programs/{program}', [ProgramController::class, 'show'])->name('programs.show');
    Route::post('programs/{program}/registrations', [ProgramController::class, 'register'])->middleware('throttle:10,1')->name('programs.register');
});
