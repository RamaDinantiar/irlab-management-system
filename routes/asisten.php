<?php

use App\Http\Controllers\Asisten\ClassAccessController;
use App\Http\Controllers\Asisten\ClassAnnouncementController;
use App\Http\Controllers\Asisten\ClassController;
use App\Http\Controllers\Asisten\ClassDetailController;
use App\Http\Controllers\Asisten\ClassProposalController;
use App\Http\Controllers\Asisten\CourseProposalController;
use App\Http\Controllers\Asisten\GenerateController;
use App\Http\Controllers\Asisten\GradeController;
use App\Http\Controllers\Asisten\MeetingController;
use App\Http\Controllers\Asisten\ReportController;
use App\Http\Controllers\Asisten\ScheduleController;
use App\Http\Controllers\Asisten\SeatController;
use App\Http\Controllers\Asisten\SessionController;
use App\Http\Controllers\Asisten\ShiftController;
use App\Http\Controllers\Asisten\ShiftSwapController;
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
Route::get('class/{class}/announcements', [ClassDetailController::class, 'announcements'])->name('class.announcements');
Route::post('classes/{class}/announcements', [ClassAnnouncementController::class, 'store'])->name('classes.announcements.store');
Route::put('announcements/{announcement}', [ClassAnnouncementController::class, 'update'])->name('announcements.update');
Route::delete('announcements/{announcement}', [ClassAnnouncementController::class, 'destroy'])->name('announcements.destroy');
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

// FR-AS: Schedule, shift & tukar shift (US-A05).
Route::get('schedule', [ScheduleController::class, 'index'])->name('schedule');
Route::get('shifts/{shift}/swap-candidates', [ShiftSwapController::class, 'candidates'])->name('shifts.swap-candidates');
Route::post('shift-swaps', [ShiftSwapController::class, 'store'])->name('shift-swaps.store');
Route::post('shift-swaps/{shiftSwap}/respond', [ShiftSwapController::class, 'respond'])->name('shift-swaps.respond');
Route::delete('shift-swaps/{shiftSwap}', [ShiftSwapController::class, 'destroy'])->name('shift-swaps.destroy');
Route::post('shifts/generate', [ShiftController::class, 'generate'])->name('shifts.generate');
Route::post('shifts', [ShiftController::class, 'store'])->name('shifts.store');
Route::delete('shifts/{shift}', [ShiftController::class, 'destroy'])->name('shifts.destroy');

// FR-AR: Laporan Ngawas (US-A03).
Route::get('report', [ReportController::class, 'index'])->name('reports.index');
Route::post('reports', [ReportController::class, 'store'])->name('reports.store');
Route::post('reports/{report}', [ReportController::class, 'update'])->name('reports.update'); // multipart (foto)
Route::delete('reports/{report}', [ReportController::class, 'destroy'])->name('reports.destroy');
Route::post('reports/{report}/verify', [ReportController::class, 'verify'])->name('reports.verify');
Route::post('reports/{report}/return', [ReportController::class, 'return'])->name('reports.return');
Route::post('reports/{report}/unlock', [ReportController::class, 'unlock'])->name('reports.unlock');

// FR-AGN: Generate rekap bulanan + honor (US-A04).
Route::get('generate', [GenerateController::class, 'index'])->name('generate.index');
Route::post('exports', [GenerateController::class, 'store'])->middleware('throttle:10,1')->name('exports.store');
Route::get('exports/{export}', [GenerateController::class, 'show'])->name('exports.show');
Route::post('honor-recaps/approve', [GenerateController::class, 'approveHonor'])->name('honor-recaps.approve');
