import type { CourseRow } from '@/types';

/** "20 · 30 · 50" dengan label untuk pembaca layar. */
export function CourseWeights({ weights }: { weights: CourseRow['weights'] }) {
    return (
        <span
            className="font-mono text-sm whitespace-nowrap"
            aria-label={`Bobot pre-test ${weights.pretest}%, post-test ${weights.posttest}%, laporan ${weights.report}%`}
        >
            {weights.pretest} · {weights.posttest} · {weights.report}
        </span>
    );
}
