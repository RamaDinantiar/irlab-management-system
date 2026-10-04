<?php

use App\Http\Controllers\Asisten\ClassAccessController;
use App\Http\Controllers\Asisten\ClassController;
use App\Http\Controllers\Asisten\ClassDetailController;
use App\Http\Controllers\Asisten\MeetingController;
use App\Http\Controllers\Asisten\SessionController;
use App\Http\Controllers\Asisten\ClassProposalController;
use App\Http\Controllers\Asisten\CourseProposalController;
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
