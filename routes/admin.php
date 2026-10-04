<?php

use App\Http\Controllers\Admin\ClassController;
use App\Http\Controllers\Admin\CourseController;
use App\Http\Controllers\Admin\RoomController;
use App\Http\Controllers\Admin\SeatContractController;
use App\Http\Controllers\Admin\SemesterController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

/*
 * Route modul Admin (prefix /admin, nama admin.*, middleware role:admin).
 * Dimuat dari routes/web.php sebelum route "Segera hadir".
 */

Route::resource('semesters', SemesterController::class)->only(['index', 'store', 'update', 'destroy']);
Route::post('semesters/{semester}/activate', [SemesterController::class, 'activate'])->name('semesters.activate');
Route::post('semesters/{semester}/copy-structure', [SemesterController::class, 'copyStructure'])->name('semesters.copy-structure');

Route::resource('courses', CourseController::class)->only(['index', 'store', 'update', 'destroy']);
Route::post('courses/{course}/approve', [CourseController::class, 'approve'])->name('courses.approve');
Route::post('courses/{course}/reject', [CourseController::class, 'reject'])->name('courses.reject');

Route::resource('classes', ClassController::class)->only(['index', 'store', 'update', 'destroy']);
Route::post('classes/{class}/approve', [ClassController::class, 'approve'])->name('classes.approve');
Route::post('classes/{class}/reject', [ClassController::class, 'reject'])->name('classes.reject');
Route::post('classes/{class}/token', [ClassController::class, 'regenerateToken'])->name('classes.token');
Route::post('classes/{class}/lock', [ClassController::class, 'lock'])->name('classes.lock');

Route::resource('rooms', RoomController::class)->only(['index', 'store', 'update', 'destroy']);
Route::get('rooms/{room}/layout', [RoomController::class, 'layout'])->name('rooms.layout');
Route::put('rooms/{room}/layout', [RoomController::class, 'saveLayout'])->name('rooms.layout.update');

// FR-ADM-06 / US-D03: koreksi kontrak kursi.
Route::get('seat-contracts', [SeatContractController::class, 'index'])->name('seat-contracts.index');
Route::put('seat-contracts/{contract}', [SeatContractController::class, 'update'])->name('seat-contracts.update');
Route::delete('seat-contracts/{contract}', [SeatContractController::class, 'destroy'])->name('seat-contracts.destroy');

Route::get('users/import-template', [UserController::class, 'template'])->name('users.import-template');
Route::post('users/import', [UserController::class, 'import'])->name('users.import');
Route::resource('users', UserController::class)->only(['index', 'store', 'update']);
Route::post('users/{user}/activation', [UserController::class, 'activation'])->name('users.activation');
Route::post('users/{user}/password', [UserController::class, 'resetPassword'])->name('users.password');
