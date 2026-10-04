import { Form, Head } from '@inertiajs/react';
import { ShieldCheck } from 'lucide-react';
import { NewPasswordFields } from '@/components/new-password-fields';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { logout } from '@/routes';
import { update } from '@/routes/password/change';

/** FR-AUTH-05: wajib ganti kata sandi sementara pada login pertama. */
export default function ChangePassword({
    passwordRules,
}: {
    passwordRules: string;
}) {
    return (
        <>
            <Head title="Ganti Kata Sandi" />

            <p className="mb-6 flex items-start gap-2 border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
                Akun Anda masih memakai kata sandi sementara dari admin lab.
                Demi keamanan, buat kata sandi baru sebelum melanjutkan.
            </p>

            <Form
                {...update.form()}
                resetOnError
                className="flex flex-col gap-6"
            >
                {({ processing, errors }) => (
                    <>
                        <NewPasswordFields
                            errors={errors}
                            passwordRules={passwordRules}
                        />

                        <Button
                            type="submit"
                            size="lg"
                            className="mt-2 h-14 w-full text-h3"
                            disabled={processing}
                        >
                            {processing && <Spinner />}
                            Simpan & Lanjutkan
                        </Button>

                        <TextLink
                            href={logout()}
                            as="button"
                            className="self-center text-sm"
                        >
                            Keluar
                        </TextLink>
                    </>
                )}
            </Form>
        </>
    );
}

ChangePassword.layout = {
    title: 'Ganti Kata Sandi',
    description: 'Langkah terakhir sebelum masuk ke Dashboard IR Lab.',
};
