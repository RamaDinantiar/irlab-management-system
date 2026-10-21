// Components
import { Form, Head } from '@inertiajs/react';
import {
    LogoutConfirmDialog,
    confirmLogout,
} from '@/components/logout-confirm-dialog';
import { textLinkClass } from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    return (
        <>
            <Head title="Verifikasi Email" />

            {status === 'verification-link-sent' && (
                <div className="mb-4 text-center text-sm font-medium text-success">
                    Tautan verifikasi baru telah dikirim ke email Anda.
                </div>
            )}

            <Form {...send.form()} className="space-y-6 text-center">
                {({ processing }) => (
                    <>
                        <Button disabled={processing} variant="secondary">
                            {processing && <Spinner />}
                            Kirim ulang email verifikasi
                        </Button>

                        <button
                            type="button"
                            onClick={confirmLogout}
                            className={cn(
                                textLinkClass,
                                'mx-auto block text-sm',
                            )}
                            data-test="logout-button"
                        >
                            Keluar
                        </button>
                    </>
                )}
            </Form>

            <LogoutConfirmDialog />
        </>
    );
}

VerifyEmail.layout = {
    title: 'Verifikasi Email',
    description:
        'Silakan verifikasi email Anda melalui tautan yang baru saja kami kirim.',
};
