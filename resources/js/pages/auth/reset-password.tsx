import { Form, Head } from '@inertiajs/react';
import { NewPasswordFields } from '@/components/new-password-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { update } from '@/routes/password';

type Props = {
    email: string;
    passwordRules: string;
};

/** Lupa password langkah 3: kode OTP sudah benar → buat password baru. */
export default function ResetPassword({ email, passwordRules }: Props) {
    return (
        <>
            <Head title="Atur Ulang Kata Sandi" />

            <Form
                {...update.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2.5">
                            <Label htmlFor="email" className="text-lg">
                                Email Instansi
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="username"
                                value={email}
                                className="h-12"
                                readOnly
                            />
                        </div>

                        <NewPasswordFields
                            errors={errors}
                            passwordRules={passwordRules}
                        />

                        <Button
                            type="submit"
                            size="lg"
                            className="mt-2 h-14 w-full text-h3"
                            disabled={processing}
                            data-test="reset-password-button"
                        >
                            {processing && <Spinner />}
                            Simpan Kata Sandi
                        </Button>
                    </>
                )}
            </Form>
        </>
    );
}

ResetPassword.layout = {
    title: 'Atur Ulang Kata Sandi',
    description: 'Buat kata sandi baru untuk akun portal Anda.',
};
