export { TASK_TYPE_LABEL, TASK_TYPE_SLUG } from '@/types/task';

/** ISO → nilai <input type="datetime-local"> dalam WIB. */
export function toLocalInput(iso: string | null | undefined): string {
    if (!iso) {
        return '';
    }

    return new Date(new Date(iso).getTime() + 7 * 3600_000)
        .toISOString()
        .slice(0, 16);
}
