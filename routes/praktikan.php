<?php

use App\Http\Controllers\Praktikan\ClassController;
use App\Http\Controllers\Praktikan\EnrollmentController;
use App\Http\Controllers\Praktikan\ScheduleController;
use Illuminate\Support\Facades\Route;

/*
 * Route modul Praktikan (prefix /praktikan, nama praktikan.*, middleware role:praktikan).
 * Dimuat dari routes/web.php sebelum route "Segera hadir".
 */

Route::get('class', [ClassController::class, 'index'])->name('class.index');
Route::get('schedule', [ScheduleController::class, 'index'])->name('schedule');

// US-P01-7: batas percobaan kode salah ditangani di JoinClass (5 per 10 menit).
Route::post('enrollments', [EnrollmentController::class, 'store'])->name('enrollments.store');
