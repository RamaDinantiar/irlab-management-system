<?php

use App\Http\Controllers\Asisten\ClassAccessController;
use App\Http\Controllers\Asisten\ClassController;
use App\Http\Controllers\Asisten\ClassDetailController;
use App\Http\Controllers\Asisten\ClassProposalController;
use App\Http\Controllers\Asisten\CourseProposalController;
use App\Http\Controllers\Asisten\GradeController;
use App\Http\Controllers\Asisten\MeetingController;
use App\Http\Controllers\Asisten\SeatController;
use App\Http\Controllers\Asisten\SessionController;
use App\Http\Controllers\Asisten\TaskController;
use Illuminate\Support\Facades\Route;

/*
 * Route modul Asisten (prefix /asisten, nama asisten.*, middleware role:asisten).
 * Dimuat dari routes/web.php sebelum route "Segera hadir".
 */

Route::get('class', [ClassController::class, 'index'])->name('class.index');
// FR-AC-02: detail kelas bertab.
Route::get('class/{class}', [ClassDetailController::class, 'members'])->name('class.show');
Route::get('class/{class}/meetings', [ClassDetailController::class, 'meetings'])->name('class.meetings');
Route::get('class/{class}/attendance', [ClassDetailController::class, 'attendance'])->name('class.attendance');
Route::get('class/{class}/settings', [ClassDetailController::class, 'settings'])->name('class.settings');
Route::put('classes/{class}/settings', [ClassDetailController::class, 'updateSettings'])->name('classes.settings.update');
Route::delete('classes/{class}/members/{enrollment}', [ClassDetailController::class, 'removeMember'])->name('classes.members.destroy');

// FR-AC-04: pertemuan & modul.
Route::post('classes/{class}/meetings/generate', [MeetingController::class, 'generate'])->name('classes.meetings.generate');
Route::post('classes/{class}/meetings', [MeetingController::class, 'store'])->name('classes.meetings.store');
Route::put('meetings/{meeting}', [MeetingController::class, 'update'])->name('meetings.update');
Route::delete('meetings/{meeting}', [MeetingController::class, 'destroy'])->name('meetings.destroy');

// FR-AD-01: Mulai Sesi Kelas + presensi.
Route::get('sessions', [SessionController::class, 'index'])->name('sessions.index');
Route::get('sessions/{meeting}', [SessionController::class, 'show'])->name('sessions.show');
Route::post('sessions/{meeting}/start', [SessionController::class, 'start'])->name('sessions.start');
Route::put('sessions/{meeting}/attendance', [SessionController::class, 'saveAttendance'])->name('sessions.attendance');

Route::post('course-proposals', [CourseProposalController::class, 'store'])->name('course-proposals.store');
Route::put('course-proposals/{course}', [CourseProposalController::class, 'update'])->name('course-proposals.update');

Route::post('class-proposals', [ClassProposalController::class, 'store'])->name('class-proposals.store');
Route::put('class-proposals/{class}', [ClassProposalController::class, 'update'])->name('class-proposals.update');
Route::post('classes/{class}/token', [ClassAccessController::class, 'regenerateToken'])->name('classes.token');
Route::post('classes/{class}/lock', [ClassAccessController::class, 'lock'])->name('classes.lock');

// FR-AT: Task Management (Asisten & Admin).
Route::get('task/{type?}', [TaskController::class, 'index'])->where('type', 'laporan|post-test|pre-test')->name('tasks.index');
Route::get('tasks/create', [TaskController::class, 'create'])->name('tasks.create');
Route::post('tasks', [TaskController::class, 'store'])->name('tasks.store');
Route::get('tasks/{task}/edit', [TaskController::class, 'edit'])->name('tasks.edit');
Route::put('tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
Route::post('tasks/{task}/duplicate', [TaskController::class, 'duplicate'])->name('tasks.duplicate');
Route::delete('tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');

// FR-AG: Grade (inline batch, publikasi, split-screen, ekspor).
Route::get('grade/{type?}', [GradeController::class, 'index'])->where('type', 'laporan|post-test|pre-test')->name('grades.index');
Route::patch('grades/batch', [GradeController::class, 'batch'])->name('grades.batch');
Route::post('grading/{target}/publish', [GradeController::class, 'publish'])->name('grading.publish');
Route::get('grading/{target}/review', [GradeController::class, 'review'])->name('grading.review');
Route::get('submissions/{submission}/zip', [GradeController::class, 'zipFile'])->name('submissions.zip');
Route::get('classes/{class}/grades/export', [GradeController::class, 'export'])->name('classes.grades.export');

// Seat Mapping (read-only).
Route::get('seats', [SeatController::class, 'index'])->name('seats.index');
