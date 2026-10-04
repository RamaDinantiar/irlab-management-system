import { router, usePage } from '@inertiajs/react';
import { Clock } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { login, logout } from '@/routes';
import { keepAlive } from '@/routes/session';

/** Peringatan muncul 2 menit sebelum logout otomatis (FR-AUTH-06). */
const WARNING_MS = 2 * 60_000;
/** Selama pengguna aktif, sesi server diperpanjang paling sering tiap 5 menit. */
const KEEP_ALIVE_EVERY_MS = 5 * 60_000;
/** Aktivitas dicatat paling sering tiap 5 detik agar tidak membebani. */
const ACTIVITY_THROTTLE_MS = 5_000;
const ACTIVITY_EVENTS = [
    'mousemove',
    'mousedown',
    'keydown',
    'touchstart',
    'scroll',
] as const;

type SessionMessage = { type: 'activity'; at: number } | { type: 'logout' };

function xsrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));

    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * FR-AUTH-06: logout otomatis setelah idle sesuai SESSION_LIFETIME (30 menit),
 * dengan peringatan 2 menit sebelumnya dan sinkron antar tab (BroadcastChannel).
 * Tidak aktif untuk sesi Remember Me (pengguna memilih tetap masuk di perangkat itu).
 */
export function IdleSessionGuard() {
    const { auth } = usePage().props;
    const lifetimeMs = (auth.session?.lifetime ?? 30) * 60_000;
    const enabled = !!auth.user && !auth.session?.remembered;

    const lastActivity = useRef(Date.now());
    const lastPing = useRef(Date.now());
    const loggingOut = useRef(false);
    const channel = useRef<BroadcastChannel | null>(null);
    const [remaining, setRemaining] = useState(lifetimeMs);

    const warning = enabled && remaining <= WARNING_MS;

    const ping = useCallback(() => {
        lastPing.current = Date.now();
        void fetch(keepAlive.url(), {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-XSRF-TOKEN': xsrfToken(),
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
            },
        });
    }, []);

    const markActive = useCallback(
        (at: number, broadcast: boolean) => {
            lastActivity.current = at;
            setRemaining(lifetimeMs);

            if (broadcast) {
                channel.current?.postMessage({ type: 'activity', at });
            }
        },
        [lifetimeMs],
    );

    const signOut = useCallback((broadcast: boolean) => {
        if (loggingOut.current) {
            return;
        }

        loggingOut.current = true;

        if (broadcast) {
            channel.current?.postMessage({ type: 'logout' });
        }

        router.flushAll();
        router.post(
            logout(),
            {},
            {
                onFinish: () =>
                    router.visit(login({ query: { expired: 1 } }), {
                        replace: true,
                    }),
            },
        );
    }, []);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        channel.current =
            'BroadcastChannel' in window
                ? new BroadcastChannel('irlab-session')
                : null;

        channel.current?.addEventListener(
            'message',
            (event: MessageEvent<SessionMessage>) => {
                if (event.data.type === 'activity') {
                    markActive(event.data.at, false);
                } else {
                    signOut(false);
                }
            },
        );

        let lastRecorded = 0;
        const onActivity = () => {
            const now = Date.now();

            // Saat peringatan tampil, hanya tombol "Tetap Masuk" yang memperpanjang sesi.
            if (
                now - lastRecorded < ACTIVITY_THROTTLE_MS ||
                lastActivity.current + lifetimeMs - now <= WARNING_MS
            ) {
                return;
            }

            lastRecorded = now;
            markActive(now, true);
        };

        ACTIVITY_EVENTS.forEach((name) =>
            window.addEventListener(name, onActivity, { passive: true }),
        );

        const timer = window.setInterval(() => {
            const now = Date.now();
            const left = lastActivity.current + lifetimeMs - now;

            setRemaining(left);

            if (left <= 0) {
                signOut(true);

                return;
            }

            if (
                lastActivity.current > lastPing.current &&
                now - lastPing.current >= KEEP_ALIVE_EVERY_MS
            ) {
                ping();
            }
        }, 1000);

        return () => {
            ACTIVITY_EVENTS.forEach((name) =>
                window.removeEventListener(name, onActivity),
            );
            window.clearInterval(timer);
            channel.current?.close();
            channel.current = null;
        };
    }, [enabled, lifetimeMs, markActive, ping, signOut]);

    const stay = () => {
        markActive(Date.now(), true);
        ping();
    };

    return (
        <Dialog open={warning} onOpenChange={(open) => !open && stay()}>
            <DialogContent
                onInteractOutside={(event) => event.preventDefault()}
                className="sm:max-w-md"
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Clock className="size-6 text-warning" aria-hidden />
                        Sesi akan berakhir
                    </DialogTitle>
                    <DialogDescription>
                        Anda tidak aktif cukup lama. Demi keamanan, Anda akan
                        keluar otomatis dalam{' '}
                        <strong className="font-mono text-foreground">
                            {formatCountdown(remaining)}
                        </strong>
                        .
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => signOut(true)}>
                        Keluar Sekarang
                    </Button>
                    <Button onClick={stay} autoFocus>
                        Tetap Masuk
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
