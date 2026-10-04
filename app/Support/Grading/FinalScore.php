<?php

namespace App\Support\Grading;

use App\Enums\TaskType;
use App\Models\Course;
use App\Models\Grade;

/**
 * PRD A6: nilai akhir mata kuliah = rata-rata berbobot komponen Pre-test,
 * Post-test, Laporan (bobot dari Mata Kuliah). Setiap komponen = rata-rata
 * persentase (nilai/maks × 100) dari nilai yang sudah dipublikasikan.
 * "Sementara": komponen tanpa nilai tidak ikut, bobot dinormalisasi.
 */
class FinalScore
{
    /**
     * @param  iterable<Grade>  $grades  nilai terpublikasi milik satu praktikan pada mata kuliah ini
     * @return array{pretest: float|null, posttest: float|null, report: float|null, final: float|null, letter: string|null}
     */
    public static function compute(Course $course, iterable $grades): array
    {
        $buckets = ['pretest' => [], 'posttest' => [], 'report' => []];

        foreach ($grades as $grade) {
            $task = $grade->submission->target->task;
            if ($grade->score === null || $task->max_score <= 0) {
                continue;
            }

            $buckets[$task->type->value][] = (float) $grade->score / $task->max_score * 100;
        }

        $weights = [
            TaskType::Pretest->value => $course->weight_pretest,
            TaskType::Posttest->value => $course->weight_posttest,
            TaskType::Report->value => $course->weight_report,
        ];

        $components = array_map(fn (array $values) => $values === [] ? null : round(array_sum($values) / count($values), 1), $buckets);

        $weighted = 0.0;
        $weightSum = 0;
        foreach ($components as $type => $value) {
            if ($value !== null) {
                $weighted += $value * $weights[$type];
                $weightSum += $weights[$type];
            }
        }

        $final = $weightSum > 0 ? round($weighted / $weightSum, 1) : null;

        return [...$components, 'final' => $final, 'letter' => $final === null ? null : self::letter($final)];
    }

    /**
     * Huruf mutu (asumsi skala umum; sesuaikan dengan kebijakan kampus).
     */
    public static function letter(float $score): string
    {
        return match (true) {
            $score >= 85 => 'A',
            $score >= 80 => 'AB',
            $score >= 70 => 'B',
            $score >= 65 => 'BC',
            $score >= 55 => 'C',
            $score >= 40 => 'D',
            default => 'E',
        };
    }
}
