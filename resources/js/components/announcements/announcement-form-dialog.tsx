import { useForm } from '@inertiajs/react';
import type { FormEvent, ReactNode } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import type { AnnouncementRow } from '@/types';

const ROLES = [
    ['praktikan', 'Praktikan'],
    ['asisten', 'Asisten'],
    ['admin', 'Admin'],
] as const;

/** ISO → nilai <input type="datetime-local"> (waktu lokal). */
const toLocal = (iso: string | null | undefined) => {
    if (!iso) return '';
    const d = new Date(iso);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());

    return d.toISOString().slice(0, 16);
};

/**
 * Form pengumuman. `classOptions` (Admin) membuka pilihan cakupan global/kelas
 * dan target peran; tanpa itu (Asisten) pengumuman selalu untuk kelasnya.
 */
export function AnnouncementFormDialog({
    trigger,
    announcement,
    action,
    method,
    classOptions,
}: {
    trigger: ReactNode;
    announcement?: AnnouncementRow;
    action: string;
    method: 'post' | 'put';
    classOptions?: { id: number; label: string }[];
}) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        scope: announcement?.scope ?? 'global',
        class_id: announcement?.classId ? String(announcement.classId) : '',
        title: announcement?.title ?? '',
        body: announcement?.body ?? '',
        pinned: announcement?.pinned ?? false,
        target_roles: announcement?.targetRoles ?? ([] as string[]),
        publish_at: toLocal(announcement?.publishAt),
        expire_at: toLocal(announcement?.expireAt),
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.submit(method, action, {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                if (!announcement) form.reset();
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>
                        {announcement ? 'Ubah Pengumuman' : 'Buat Pengumuman'}
                    </DialogTitle>
                    <DialogDescription>
                        Penerima mendapat notifikasi lonceng saat pengumuman
                        terbit. Isi mendukung Markdown.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="grid gap-4">
                    {classOptions && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="an-scope">Cakupan</Label>
                                <select
                                    id="an-scope"
                                    value={form.data.scope}
                                    onChange={(e) =>
                                        form.setData(
                                            'scope',
                                            e.target.value as
                                                | 'global'
                                                | 'class',
                                        )
                                    }
                                    className="h-10 border border-input bg-white px-3 text-sm"
                                >
                                    <option value="global">Global</option>
                                    <option value="class">Satu kelas</option>
                                </select>
                            </div>
                            {form.data.scope === 'class' ? (
                                <div className="grid gap-2">
                                    <Label htmlFor="an-class">Kelas</Label>
                                    <select
                                        id="an-class"
                                        required
                                        value={form.data.class_id}
                                        onChange={(e) =>
                                            form.setData(
                                                'class_id',
                                                e.target.value,
                                            )
                                        }
                                        className="h-10 border border-input bg-white px-3 text-sm"
                                    >
                                        <option value="">Pilih kelas…</option>
                                        {classOptions.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.label}
                                            </option>
                                        ))}
                                    </select>
                                    <InputError
                                        message={form.errors.class_id}
                                    />
                                </div>
                            ) : (
                                <fieldset className="grid gap-2">
                                    <legend className="mb-2 text-sm font-medium">
                                        Target peran (kosong = semua)
                                    </legend>
                                    <div className="flex flex-wrap gap-4">
                                        {ROLES.map(([value, label]) => (
                                            <label
                                                key={value}
                                                className="flex items-center gap-2 text-sm"
                                            >
                                                <Checkbox
                                                    checked={form.data.target_roles.includes(
                                                        value,
                                                    )}
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        form.setData(
                                                            'target_roles',
                                                            checked
                                                                ? [
                                                                      ...form
                                                                          .data
                                                                          .target_roles,
                                                                      value,
                                                                  ]
                                                                : form.data.target_roles.filter(
                                                                      (r) =>
                                                                          r !==
                                                                          value,
                                                                  ),
                                                        )
                                                    }
                                                />
                                                {label}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            )}
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label htmlFor="an-title">Judul</Label>
                        <Input
                            id="an-title"
                            required
                            maxLength={150}
                            value={form.data.title}
                            onChange={(e) =>
                                form.setData('title', e.target.value)
                            }
                        />
                        <InputError message={form.errors.title} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="an-body">Isi</Label>
                        <Textarea
                            id="an-body"
                            required
                            rows={6}
                            maxLength={5000}
                            value={form.data.body}
                            onChange={(e) =>
                                form.setData('body', e.target.value)
                            }
                        />
                        <InputError message={form.errors.body} />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="grid gap-2">
                            <Label htmlFor="an-publish">Mulai tayang</Label>
                            <Input
                                id="an-publish"
                                type="datetime-local"
                                value={form.data.publish_at}
                                onChange={(e) =>
                                    form.setData('publish_at', e.target.value)
                                }
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Kosong = sekarang.
                            </p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="an-expire">
                                Akhir tayang (opsional)
                            </Label>
                            <Input
                                id="an-expire"
                                type="datetime-local"
                                value={form.data.expire_at}
                                onChange={(e) =>
                                    form.setData('expire_at', e.target.value)
                                }
                            />
                            <InputError message={form.errors.expire_at} />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={form.data.pinned}
                            onCheckedChange={(checked) =>
                                form.setData('pinned', checked === true)
                            }
                        />{' '}
                        Pin di atas
                    </label>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            Batal
                        </Button>
                        <Button type="submit" disabled={form.processing}>
                            {form.processing && <Spinner />}{' '}
                            {announcement ? 'Simpan' : 'Terbitkan'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
