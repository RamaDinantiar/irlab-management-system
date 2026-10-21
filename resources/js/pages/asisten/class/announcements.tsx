import { Megaphone, Pencil, Plus } from 'lucide-react';
import ClassAnnouncementController from '@/actions/App/Http/Controllers/Asisten/ClassAnnouncementController';
import { AnnouncementCard } from '@/components/announcements/announcement-card';
import { AnnouncementFormDialog } from '@/components/announcements/announcement-form-dialog';
import { ClassDetailLayout } from '@/components/classes/class-detail-layout';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import type { AnnouncementRow, ClassRow } from '@/types';

/** Asisten › detail kelas › Pengumuman (pengumuman per kelas). */
export default function ClassAnnouncements({
    klass,
    announcements,
}: {
    klass: ClassRow;
    announcements: AnnouncementRow[];
}) {
    return (
        <ClassDetailLayout klass={klass} title="Pengumuman">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    Pengumuman tampil di dashboard praktikan kelas ini dan
                    dikirim sebagai notifikasi.
                </p>
                <AnnouncementFormDialog
                    action={ClassAnnouncementController.store.url(klass.id)}
                    method="post"
                    trigger={
                        <Button>
                            <Plus /> Buat Pengumuman
                        </Button>
                    }
                />
            </div>
            {announcements.length === 0 ? (
                <EmptyState
                    icon={Megaphone}
                    title="Belum ada pengumuman"
                    description="Mis. perubahan jadwal, materi pertemuan, atau persiapan pre-test."
                />
            ) : (
                <div className="grid gap-4">
                    {announcements.map((a) => (
                        <AnnouncementCard
                            key={a.id}
                            announcement={a}
                            showStatus
                            actions={
                                <>
                                    <AnnouncementFormDialog
                                        announcement={a}
                                        action={ClassAnnouncementController.update.url(
                                            a.id,
                                        )}
                                        method="put"
                                        trigger={
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                aria-label={`Ubah ${a.title}`}
                                            >
                                                <Pencil />
                                            </Button>
                                        }
                                    />
                                    <ConfirmDeleteDialog
                                        action={ClassAnnouncementController.destroy.form(
                                            a.id,
                                        )}
                                        title={`Hapus "${a.title}"?`}
                                        description="Pengumuman dihapus dari dashboard praktikan."
                                    />
                                </>
                            }
                        />
                    ))}
                </div>
            )}
        </ClassDetailLayout>
    );
}
