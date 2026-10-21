import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { Camera, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import AvatarController from '@/actions/App/Http/Controllers/Settings/AvatarController';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useInitials } from '@/hooks/use-initials';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';

/** Pengaturan Akun › Profil. NIM & peran dikelola Admin (read-only). */
export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage().props;
    const user = auth.user;
    const praktikan = user.role === 'praktikan';
    const getInitials = useInitials();
    const fileInput = useRef<HTMLInputElement>(null);

    return (
        <>
            <Head title="Profil" />
            <h1 className="sr-only">Profil</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Profil"
                    description="Perbarui foto, nama, kontak, dan data akademik Anda."
                />

                <Form
                    {...AvatarController.update.form()}
                    options={{ preserveScroll: true }}
                    resetOnSuccess
                    className="flex flex-wrap items-center gap-4 border p-4"
                >
                    {({ processing, errors, submit }) => (
                        <>
                            <Avatar className="size-20 overflow-hidden rounded-full">
                                <AvatarImage
                                    src={user.avatar ?? undefined}
                                    alt={user.name}
                                    className="object-cover"
                                />
                                <AvatarFallback className="bg-primary-100 text-h3 text-primary-700">
                                    {getInitials(user.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 gap-2">
                                <Label htmlFor="avatar">Foto profil</Label>
                                <input
                                    ref={fileInput}
                                    id="avatar"
                                    name="avatar"
                                    type="file"
                                    accept="image/jpeg,image/png"
                                    className="sr-only"
                                    onChange={() => submit()}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        disabled={processing}
                                        onClick={() =>
                                            fileInput.current?.click()
                                        }
                                    >
                                        {processing ? <Spinner /> : <Camera />}{' '}
                                        {user.avatar
                                            ? 'Ganti foto'
                                            : 'Unggah foto'}
                                    </Button>
                                    {user.avatar && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={processing}
                                            onClick={() =>
                                                router.delete(
                                                    AvatarController.destroy.url(),
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <Trash2 /> Hapus
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    JPG atau PNG, maks. 2 MB.
                                </p>
                                <InputError message={errors.avatar} />
                            </div>
                        </>
                    )}
                </Form>

                {praktikan && (!user.nim || !user.major) && (
                    <p
                        role="alert"
                        className="border border-warning/40 bg-warning-soft p-3 text-sm text-warning"
                    >
                        Lengkapi Program Studi agar dapat mengontrak kursi dan
                        mendaftar program.
                    </p>
                )}

                <Form
                    {...ProfileController.update.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="nim">NIM</Label>
                                <Input
                                    id="nim"
                                    value={user.nim ?? '—'}
                                    readOnly
                                    disabled
                                    className="font-mono"
                                />
                                <p className="text-xs text-muted-foreground">
                                    NIM diatur oleh Admin Lab.
                                </p>
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="name">Nama lengkap</Label>
                                <Input
                                    id="name"
                                    defaultValue={user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                />
                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    defaultValue={user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                />
                                <InputError message={errors.email} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="phone">
                                    Nomor HP / WhatsApp
                                </Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    inputMode="tel"
                                    defaultValue={user.phone ?? ''}
                                    name="phone"
                                    autoComplete="tel"
                                    maxLength={20}
                                    placeholder="081234567890"
                                    className="font-mono"
                                />
                                <InputError message={errors.phone} />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
                                <div className="grid gap-2">
                                    <Label htmlFor="major">Program Studi</Label>
                                    <Input
                                        id="major"
                                        defaultValue={user.major ?? ''}
                                        name="major"
                                        placeholder="S1 Teknik Informatika"
                                    />
                                    <InputError message={errors.major} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="cohort_year">
                                        Angkatan
                                    </Label>
                                    <Input
                                        id="cohort_year"
                                        type="number"
                                        min={2000}
                                        max={2100}
                                        defaultValue={user.cohort_year ?? ''}
                                        name="cohort_year"
                                        placeholder="2023"
                                    />
                                    <InputError message={errors.cohort_year} />
                                </div>
                            </div>

                            {mustVerifyEmail &&
                                user.email_verified_at === null && (
                                    <div>
                                        <p className="-mt-4 text-sm text-muted-foreground">
                                            Email Anda belum terverifikasi.{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-foreground underline underline-offset-4"
                                            >
                                                Kirim ulang email verifikasi.
                                            </Link>
                                        </p>
                                        {status ===
                                            'verification-link-sent' && (
                                            <div className="mt-2 text-sm font-medium text-success">
                                                Tautan verifikasi baru telah
                                                dikirim.
                                            </div>
                                        )}
                                    </div>
                                )}

                            <Button
                                disabled={processing}
                                data-test="update-profile-button"
                            >
                                {processing && <Spinner />} Simpan
                            </Button>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

Profile.layout = {
    breadcrumbs: [{ title: 'Pengaturan Akun', href: edit() }],
};
