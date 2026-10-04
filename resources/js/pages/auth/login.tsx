import { Form, Head, usePage } from '@inertiajs/react';
import { Clock, KeyRound, UserRound } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
};

/**
 * Figma "Masuk" (FR-AUTH-01). Tombol "Lanjut dengan Microsoft" dan link "Daftar"
 * sengaja tidak ada: SSO & registrasi mandiri di luar MVP (PRD A1, Bagian 9).
 */
export default function Login({ status, canResetPassword }: Props) {
    const { url } = usePage();
    // FR-AUTH-06: dikirim timer idle setelah logout otomatis.
    const expired = new URL(url, 'http://localhost').searchParams.has(
        'expired',
    );

    return (
        <>
            <Head title="Masuk" />

            {expired && (
                <p
                    role="status"
                    className="mb-6 flex items-center gap-2 border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
                >
                    <Clock className="size-4 shrink-0" aria-hidden />
                    Sesi Anda berakhir karena tidak ada aktivitas selama 30
                    menit. Silakan masuk kembali.
                </p>
            )}

            {status && (
                <p
                    role="status"
                    className="mb-6 border border-success/30 bg-success-soft px-4 py-3 text-sm text-success"
                >
                    {status}
                </p>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2.5">
                            <Label htmlFor="login" className="text-lg">
                                NIM / Email Instansi
                            </Label>
                            <div className="relative">
                                <UserRound
                                    aria-hidden
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-primary-200"
                                />
                                <Input
                                    id="login"
                                    name="login"
                                    required
                                    autoFocus
                                    autoComplete="username"
                                    inputMode="email"
                                    placeholder="Contoh: 202331044 atau nama@itpln.ac.id"
                                    className="h-12 pl-11"
                                    aria-invalid={!!errors.login}
                                    aria-describedby={
                                        errors.login ? 'login-error' : undefined
                                    }
                                />
                            </div>
                            <InputError
                                id="login-error"
                                message={errors.login}
                            />
                        </div>

                        <div className="grid gap-2.5">
                            <Label htmlFor="password" className="text-lg">
                                Kata Sandi Portal
                            </Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                autoComplete="current-password"
                                placeholder="Masukkan Kata Sandi"
                                icon={KeyRound}
                                className="h-12"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <Checkbox id="remember" name="remember" />
                                <Label htmlFor="remember">
                                    Ingatkan saya di perangkat ini
                                </Label>
                            </div>
                            {canResetPassword && (
                                <TextLink href={request()} className="text-sm">
                                    Lupa Password?
                                </TextLink>
                            )}
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="mt-4 h-14 w-full text-h3"
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            Masuk
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Selamat Datang!',
    description:
        'Silakan autentikasi identitas akademik Anda untuk melanjutkan.',
};
