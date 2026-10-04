import { KeyRound } from 'lucide-react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Label } from '@/components/ui/label';

/** Kata sandi baru + konfirmasi; aturan FR-AUTH-05 ditampilkan sebagai petunjuk. */
export function NewPasswordFields({
    errors,
    passwordRules,
}: {
    errors: Partial<Record<'password' | 'password_confirmation', string>>;
    passwordRules: string;
}) {
    return (
        <>
            <div className="grid gap-2.5">
                <Label htmlFor="password" className="text-lg">
                    Kata Sandi Baru
                </Label>
                <PasswordInput
                    id="password"
                    name="password"
                    required
                    autoFocus
                    autoComplete="new-password"
                    placeholder="Minimal 8 karakter"
                    icon={KeyRound}
                    className="h-12"
                    passwordrules={passwordRules}
                    aria-describedby="password-hint"
                />
                <p id="password-hint" className="text-sm text-muted-foreground">
                    Minimal 8 karakter, kombinasi huruf dan angka.
                </p>
                <InputError message={errors.password} />
            </div>

            <div className="grid gap-2.5">
                <Label htmlFor="password_confirmation" className="text-lg">
                    Ulangi Kata Sandi Baru
                </Label>
                <PasswordInput
                    id="password_confirmation"
                    name="password_confirmation"
                    required
                    autoComplete="new-password"
                    placeholder="Ketik ulang kata sandi baru"
                    icon={KeyRound}
                    className="h-12"
                    passwordrules={passwordRules}
                />
                <InputError message={errors.password_confirmation} />
            </div>
        </>
    );
}
