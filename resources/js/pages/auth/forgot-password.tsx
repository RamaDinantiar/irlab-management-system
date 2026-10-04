import { Form, Head } from '@inertiajs/react';
import { ArrowLeft, Mail } from 'lucide-react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { login } from '@/routes';
import { email } from '@/routes/password';

/** FR-AUTH-04: tautan reset berlaku 60 menit; pesan selalu generik. */
export default function ForgotPassword({ status }: { status?: string }) {
    return (
        <>
            <Head title="Lupa Password" />

            {status && (
                <p
                    role="status"
                    className="mb-6 border border-success/30 bg-success-soft px-4 py-3 text-sm text-success"
                >
                    {status}
                </p>
            )}

            <Form {...email.form()} className="flex flex-col gap-6">
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2.5">
                            <Label htmlFor="email" className="text-lg">
                                Email Instansi
                            </Label>
                            <div className="relative">
                                <Mail
                                    aria-hidden
                                    className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-primary-200"
                                />
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    required
                                    autoFocus
                                    autoComplete="email"
                                    placeholder="nama@itpln.ac.id"
                                    className="h-12 pl-11"
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        <Button
                            size="lg"
                            className="h-14 w-full text-h3"
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing && <Spinner />}
                            Kirim Tautan Reset
                        </Button>

                        <TextLink
                            href={login()}
                            className="inline-flex items-center gap-1.5 self-center text-sm"
                        >
                            <ArrowLeft className="size-4" aria-hidden />
                            Kembali ke halaman masuk
                        </TextLink>
                    </>
                )}
            </Form>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Lupa Password?',
    description:
        'Masukkan email instansi Anda. Kami akan mengirim tautan untuk mengatur ulang kata sandi (berlaku 60 menit).',
};
