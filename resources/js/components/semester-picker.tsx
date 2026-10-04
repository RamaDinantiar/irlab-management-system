import { router } from '@inertiajs/react';
import { StatusBadge } from '@/components/status-badge';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { SemesterOption } from '@/types';

const LABEL: Record<SemesterOption['status'], string> = {
    active: 'Aktif',
    draft: 'Draft',
    archived: 'Arsip',
};

/** FR-ADM-02: pemilih semester untuk melihat arsip (data arsip read-only). */
export function SemesterPicker({
    semesters,
    current,
    url,
}: {
    semesters: SemesterOption[];
    current: SemesterOption & { editable: boolean };
    /** URL halaman; `?semester=` ditambahkan otomatis. */
    url: (semester: string) => string;
}) {
    return (
        <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="semester-picker">Semester</Label>
            <Select
                value={String(current.id)}
                onValueChange={(value) =>
                    router.get(url(value), {}, { preserveScroll: true })
                }
            >
                <SelectTrigger id="semester-picker" className="min-w-64">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {semesters.map((option) => (
                        <SelectItem key={option.id} value={String(option.id)}>
                            {option.name} · {LABEL[option.status]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {!current.editable && (
                <StatusBadge status="archived" label="Arsip · read-only" />
            )}
        </div>
    );
}
