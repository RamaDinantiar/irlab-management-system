import { Form } from '@inertiajs/react';
import { KeyRound, LogIn } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import EnrollmentController from '@/actions/App/Http/Controllers/Praktikan/EnrollmentController';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

/** Huruf token (FR-ENR-01): tanpa O, 0, I, 1 agar tidak salah baca. */
const TOKEN_CHARS = /[^ABCDEFGHJKLMNPQRSTUVWXYZ23456789]/g;

/** US-P01: modal Gabung Kelas — input 6 karakter alfanumerik. */
export function JoinClassDialog({ trigger }: { trigger?: ReactNode }) {
    const [open, setOpen] = useState(false);
    const [token, setToken] = useState('');

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                setToken('');
            }}
        >
            <DialogTrigger asChild>
                {trigger ?? (
                    <Button>
                        <LogIn /> Gabung Kelas
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Gabung Kelas</DialogTitle>
                    <DialogDescription>
                        Masukkan kode 6 karakter dari asisten pengampu. Jadwal,
                        tugas, dan nilai kelas langsung muncul setelah
                        bergabung.
                    </DialogDescription>
                </DialogHeader>
                <Form
                    {...EnrollmentController.store.form()}
                    options={{ preserveScroll: true }}
                    onSuccess={() => setOpen(false)}
                    className="grid gap-5"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="join-token">Kode kelas</Label>
                                <div className="relative">
                                    <KeyRound
                                        aria-hidden
                                        className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-primary-200"
                                    />
                                    <Input
                                        id="join-token"
                                        name="token"
                                        required
                                        autoFocus
                                        autoComplete="off"
                                        autoCapitalize="characters"
                                        spellCheck={false}
                                        inputMode="text"
                                        maxLength={6}
                                        value={token}
                                        onChange={(event) =>
                                            setToken(
                                                event.target.value
                                                    .toUpperCase()
                                                    .replace(TOKEN_CHARS, ''),
                                            )
                                        }
                                        placeholder="ABC234"
                                        className="h-14 pl-11 text-center font-mono text-2xl font-bold tracking-[0.5em] uppercase"
                                        aria-invalid={!!errors.token}
                                        aria-describedby="join-token-hint join-token-error"
                                    />
                                </div>
                                <p
                                    id="join-token-hint"
                                    className="text-xs text-muted-foreground"
                                >
                                    6 karakter huruf besar & angka. Huruf O/I
                                    dan angka 0/1 tidak dipakai.
                                </p>
                                <InputError
                                    id="join-token-error"
                                    message={errors.token}
                                />
                            </div>
                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button type="button" variant="outline">
                                        Batal
                                    </Button>
                                </DialogClose>
                                <Button
                                    type="submit"
                                    disabled={processing || token.length !== 6}
                                >
                                    {processing && <Spinner />}
                                    Gabung
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
