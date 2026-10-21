import { Form, Head } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import InputError from '@/components/input-error';
import TextLink, { textLinkClass } from '@/components/text-link';
import { Button } from '@/components/ui/button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { email as sendCode, request } from '@/routes/password';
import { verify } from '@/routes/password/code';

const LENGTH = 6;

/** Lupa password langkah 2: masukkan kode OTP 6 digit dari email. */
export default function ResetCode({
    email,
    minutes,
    resendIn,
    status,
}: {
    email: string;
    minutes: number;
    resendIn: number;
    status?: string;
}) {
    const [code, setCode] = useState('');
    const [wait, setWait] = useState(resendIn);

    // Hitung mundur tombol "Kirim ulang"; disetel ulang tiap kode baru terkirim.
    useEffect(() => setWait(resendIn), [resendIn]);
    useEffect(() => {
        if (wait <= 0) {
            return;
        }

        const timer = setTimeout(() => setWait((s) => s - 1), 1000);

        return () => clearTimeout(timer);
    }, [wait]);

    return (
        <>
            <Head title="Masukkan Kode" />

            {status && (
                <p
                    role="status"
                    className="mb-6 border border-success/30 bg-success-soft px-4 py-3 text-sm text-success"
                >
                    {status}
                </p>
            )}

            <Form
                {...verify.form()}
                transform={(data) => ({ ...data, code })}
                onError={() => setCode('')}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2.5">
                            <Label htmlFor="code" className="text-lg">
                                Kode Verifikasi
                            </Label>
                            <p className="text-sm text-muted-foreground">
                                Dikirim ke{' '}
                                <span className="font-bold text-foreground">
                                    {email}
                                </span>
                                . Berlaku {minutes} menit. Periksa juga folder
                                Junk/Spam.
                            </p>
                            <InputOTP
                                id="code"
                                maxLength={LENGTH}
                                value={code}
                                onChange={setCode}
                                inputMode="numeric"
                                pattern="^[0-9]*$"
                                autoComplete="one-time-code"
                                autoFocus
                                containerClassName="justify-center"
                            >
                                <InputOTPGroup className="gap-2">
                                    {Array.from({ length: LENGTH }, (_, i) => (
                                        <InputOTPSlot
                                            key={i}
                                            index={i}
                                            className="size-12 rounded-none border font-mono text-h3 first:rounded-none last:rounded-none"
                                        />
                                    ))}
                                </InputOTPGroup>
                            </InputOTP>
                            <InputError message={errors.code} />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="h-14 w-full text-h3"
                            disabled={processing || code.length < LENGTH}
                            data-test="verify-code-button"
                        >
                            {processing && <Spinner />}
                            Verifikasi Kode
                        </Button>
                    </>
                )}
            </Form>

            <Form
                {...sendCode.form()}
                transform={() => ({ email })}
                className="mt-4 flex flex-col items-center gap-3 text-sm"
            >
                {({ processing, errors }) => (
                    <>
                        <p className="text-muted-foreground">
                            Tidak menerima kode?{' '}
                            {wait > 0 ? (
                                <span className="font-mono">
                                    Kirim ulang dalam {wait} dtk
                                </span>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className={textLinkClass}
                                >
                                    {processing ? 'Mengirim…' : 'Kirim ulang'}
                                </button>
                            )}
                        </p>
                        <InputError message={errors.email} />
                        <TextLink
                            href={request()}
                            className="inline-flex items-center gap-1.5"
                        >
                            <ArrowLeft className="size-4" aria-hidden />
                            Ganti email
                        </TextLink>
                    </>
                )}
            </Form>
        </>
    );
}

ResetCode.layout = {
    title: 'Masukkan Kode',
    description:
        'Kami telah mengirim kode 6 digit ke email kampus Anda untuk memastikan akun ini milik Anda.',
};
