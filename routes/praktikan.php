<?php

use App\Http\Controllers\Praktikan\ClassController;
use App\Http\Controllers\Praktikan\EnrollmentController;
use App\Http\Controllers\Praktikan\GradeController;
use App\Http\Controllers\Praktikan\ScheduleController;
use App\Http\Controllers\Praktikan\TaskController;
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
