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

/**
 * Lupa password langkah 1: email kampus. Email yang belum terdaftar atau
 * di luar domain kampus langsung diberi tahu; yang terdaftar dikirimi kode OTP.
 */
export default function ForgotPassword({
    domains,
    email: lastEmail,
}: {
    domains: string[];
    email: string | null;
}) {
    return (
        <>
            <Head title="Lupa Password" />

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
                                    defaultValue={lastEmail ?? ''}
                                    placeholder={`nama@${domains[0] ?? 'itpln.ac.id'}`}
                                    className="h-12 pl-11"
                                />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Hanya email kampus (
                                {domains.map((d) => `@${d}`).join(', ')}) yang
                                terdaftar di IR Lab.
                            </p>
                            <InputError message={errors.email} />
                        </div>

                        <Button
                            size="lg"
                            className="h-14 w-full text-h3"
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing && <Spinner />}
                            Kirim Kode
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
        'Masukkan email kampus Anda. Kami akan mengirim kode 6 digit untuk mengatur ulang kata sandi.',
};
