import { Head } from '@inertiajs/react';
import { Megaphone, Pencil, Plus } from 'lucide-react';
import AnnouncementController from '@/actions/App/Http/Controllers/Admin/AnnouncementController';
import { AnnouncementCard } from '@/components/announcements/announcement-card';
import { AnnouncementFormDialog } from '@/components/announcements/announcement-form-dialog';
import { ConfirmDeleteDialog } from '@/components/confirm-delete-dialog';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { Pagination } from '@/components/pagination';
import { Button } from '@/components/ui/button';
import type { AnnouncementRow, Paginated } from '@/types';

/** Admin › Pengumuman (FR-ADM-08). */
export default function AdminAnnouncements({
    announcements,
    classOptions,
}: {
    announcements: Paginated<AnnouncementRow>;
    classOptions: { id: number; label: string }[];
}) {
    return (
        <>
            <Head title="Pengumuman" />
            <div className="flex flex-col gap-6 p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Pengumuman"
                    description="Pengumuman global dengan target peran dan masa tayang, atau untuk satu kelas. Yang dipin tampil paling atas di dashboard."
                    actions={
                        <AnnouncementFormDialog
                            action={AnnouncementController.store.url()}
                            method="post"
                            classOptions={classOptions}
                            trigger={
                                <Button>
                                    <Plus /> Buat Pengumuman
                                </Button>
                            }
                        />
                    }
                />
                {announcements.data.length === 0 ? (
                    <EmptyState
                        icon={Megaphone}
                        title="Belum ada pengumuman"
                        description="Buat pengumuman pertama untuk praktikan dan asisten."
                    />
                ) : (
                    <div className="grid gap-4">
                        {announcements.data.map((a) => (
                            <AnnouncementCard
                                key={a.id}
                                announcement={a}
                                showStatus
                                actions={
                                    <>
                                        <AnnouncementFormDialog
                                            announcement={a}
                                            action={AnnouncementController.update.url(
                                                a.id,
                                            )}
                                            method="put"
                                            classOptions={classOptions}
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
                                            action={AnnouncementController.destroy.form(
                                                a.id,
                                            )}
                                            title={`Hapus "${a.title}"?`}
                                            description="Pengumuman dihapus untuk semua penerima."
                                        />
                                    </>
                                }
                            />
                        ))}
                        <Pagination paginator={announcements} />
                    </div>
                )}
            </div>
        </>
    );
}
