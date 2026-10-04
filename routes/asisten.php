<?php

use App\Http\Controllers\Asisten\ClassAccessController;
use App\Http\Controllers\Asisten\ClassController;
use App\Http\Controllers\Asisten\ClassProposalController;
use App\Http\Controllers\Asisten\CourseProposalController;
use App\Http\Controllers\Asisten\MemberController;
use Illuminate\Support\Facades\Route;

/*
 * Route modul Asisten (prefix /asisten, nama asisten.*, middleware role:asisten).
 * Dimuat dari routes/web.php sebelum route "Segera hadir".
 */

Route::get('class', [ClassController::class, 'index'])->name('class.index');
Route::get('class/{class}', [MemberController::class, 'index'])->name('class.show');
Route::delete('classes/{class}/members/{enrollment}', [MemberController::class, 'destroy'])->name('classes.members.destroy');

Route::post('course-proposals', [CourseProposalController::class, 'store'])->name('course-proposals.store');
Route::put('course-proposals/{course}', [CourseProposalController::class, 'update'])->name('course-proposals.update');

Route::post('class-proposals', [ClassProposalController::class, 'store'])->name('class-proposals.store');
Route::put('class-proposals/{class}', [ClassProposalController::class, 'update'])->name('class-proposals.update');
Route::post('classes/{class}/token', [ClassAccessController::class, 'regenerateToken'])->name('classes.token');
Route::post('classes/{class}/lock', [ClassAccessController::class, 'lock'])->name('classes.lock');
