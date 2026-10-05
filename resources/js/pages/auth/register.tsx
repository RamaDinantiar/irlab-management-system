import { Form, Head } from '@inertiajs/react';
import {
    GraduationCap,
    Hash,
    IdCard,
    KeyRound,
    Lock,
    Mail,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import { store } from '@/routes/register';

/** Usulan program studi; tetap bisa diketik bebas. */
const MAJORS = [
    'S1 Teknik Informatika',
    'S1 Sistem Informasi',
    'S1 Bisnis Digital',
    'S1 Teknik Elektro',
    'D3 Teknik Informatika',
];

/** 0–4: panjang ≥ 8, huruf besar & kecil, angka, simbol. */
function strength(password: string): number {
    if (!password) return 0;
    let score = password.length >= 8 ? 1 : 0;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++;

    return score;
}

const LEVELS = ['', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'];

function Field({
    id,
    label,
    icon: Icon,
    error,
    children,
}: {
    id: string;
    label: string;
    icon: LucideIcon;
    error?: string;
    children: (props: {
        id: string;
        className: string;
        'aria-invalid': boolean;
    }) => React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="relative">
                <Icon
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-primary-200"
                />
                {children({
                    id,
                    className: 'h-11 pl-11',
                    'aria-invalid': !!error,
                })}
            </div>
            <InputError message={error} />
        </div>
    );
}

/**
 * Figma "Daftar" — pendaftaran mandiri Praktikan, hanya email kampus;
 * akun baru wajib verifikasi email sebelum dapat dipakai.
 */
export default function Register({
    domains,
    passwordRules,
}: {
    domains: string[];
    passwordRules: string;
}) {
    const [password, setPassword] = useState('');
    const level = strength(password);
    const domainHint = domains.map((d) => `@${d}`).join(' / ');

    return (
        <>
            <Head title="Daftar Akun" />
            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-4"
            >
                {({ processing, errors }) => (
                    <>
                        <Field
                            id="name"
                            label="Nama Lengkap"
                            icon={IdCard}
                            error={errors.name}
                        >
                            {(p) => (
                                <Input
                                    {...p}
                                    name="name"
                                    required
                                    autoFocus
                                    autoComplete="name"
                                    maxLength={255}
                                    placeholder="Masukkan nama lengkap"
                                />
                            )}
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-[3fr_2fr]">
                            <Field
                                id="nim"
                                label="NIM (Nomor Induk Mahasiswa)"
                                icon={Hash}
                                error={errors.nim}
                            >
                                {(p) => (
                                    <Input
                                        {...p}
                                        name="nim"
                                        required
                                        inputMode="numeric"
                                        pattern="\d{5,20}"
                                        maxLength={20}
                                        placeholder="Contoh: 202331001"
                                        className={cn(p.className, 'font-mono')}
                                    />
                                )}
                            </Field>
                            <div className="grid gap-2">
                                <Label htmlFor="cohort_year">Angkatan</Label>
                                <Input
                                    id="cohort_year"
                                    name="cohort_year"
                                    type="number"
                                    min={2000}
                                    max={2100}
                                    placeholder="2023"
                                    className="h-11"
                                />
                                <InputError message={errors.cohort_year} />
                            </div>
                        </div>

                        <Field
                            id="major"
                            label="Jurusan / Program Studi"
                            icon={GraduationCap}
                            error={errors.major}
                        >
                            {(p) => (
                                <>
                                    <Input
                                        {...p}
                                        name="major"
                                        required
                                        list="majors"
                                        maxLength={255}
                                        placeholder="S1 Teknik Informatika"
                                    />
                                    <datalist id="majors">
                                        {MAJORS.map((m) => (
                                            <option key={m} value={m} />
                                        ))}
                                    </datalist>
                                </>
                            )}
                        </Field>

                        <div className="grid gap-2">
                            <Field
                                id="email"
                                label="Email Institusi Kampus"
                                icon={Mail}
                                error={errors.email}
                            >
                                {(p) => (
                                    <Input
                                        {...p}
                                        name="email"
                                        type="email"
                                        required
                                        autoComplete="email"
                                        placeholder={`nama${domains[0] ? `@${domains[0]}` : ''}`}
                                    />
                                )}
                            </Field>
                            <p className="-mt-1 text-xs text-muted-foreground">
                                Hanya email kampus ({domainHint}). Tautan
                                verifikasi dikirim ke email ini.
                            </p>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Kata Sandi Portal</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                autoComplete="new-password"
                                passwordrules={passwordRules}
                                placeholder="Min. 8 karakter, huruf & angka"
                                icon={KeyRound}
                                className="h-11"
                                onChange={(e) => setPassword(e.target.value)}
                                aria-describedby="password-strength"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="password_confirmation">
                                    Konfirmasi Kata Sandi
                                </Label>
                                <span
                                    id="password-strength"
                                    className="flex items-center gap-2"
                                    aria-live="polite"
                                >
                                    {level > 0 && (
                                        <span
                                            className={cn(
                                                'text-[11px] font-bold',
                                                level >= 3
                                                    ? 'text-success'
                                                    : level === 2
                                                      ? 'text-warning'
                                                      : 'text-danger',
                                            )}
                                        >
                                            {LEVELS[level]}
                                        </span>
                                    )}
                                    <span className="flex gap-1" aria-hidden>
                                        {[1, 2, 3, 4].map((i) => (
                                            <span
                                                key={i}
                                                className={cn(
                                                    'h-1 w-6',
                                                    i <= level
                                                        ? level >= 3
                                                            ? 'bg-success'
                                                            : level === 2
                                                              ? 'bg-warning'
                                                              : 'bg-danger'
                                                        : 'bg-primary-100',
                                                )}
                                            />
                                        ))}
                                    </span>
                                </span>
                            </div>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                required
                                autoComplete="new-password"
                                placeholder="Ulangi kata sandi"
                                icon={Lock}
                                className="h-11"
                            />
                            <InputError
                                message={errors.password_confirmation}
                            />
                        </div>

                        <div className="grid gap-1">
                            <div className="flex items-start gap-2">
                                <Checkbox
                                    id="terms"
                                    name="terms"
                                    value="1"
                                    className="mt-0.5"
                                />
                                <Label
                                    htmlFor="terms"
                                    className="block text-xs leading-relaxed font-normal"
                                >
                                    Saya menyetujui{' '}
                                    <strong className="text-primary-700">
                                        Ketentuan Layanan Lab IR
                                    </strong>{' '}
                                    dan bersedia mematuhi Kode Etik Akademik IT
                                    PLN.
                                </Label>
                            </div>
                            <InputError message={errors.terms} />
                        </div>

                        <Button
                            type="submit"
                            size="lg"
                            className="mt-2 h-12 w-full text-h3"
                            disabled={processing}
                            data-test="register-button"
                        >
                            {processing && <Spinner />} Daftar
                        </Button>

                        <p className="text-center text-sm">
                            Sudah punya akun?{' '}
                            <TextLink href={login()}>Masuk</TextLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Daftar Akun',
    description:
        'Lengkapi data akademik untuk sinkronisasi jadwal dan modul praktikum.',
};
