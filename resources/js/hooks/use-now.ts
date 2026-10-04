import { useEffect, useState } from 'react';

/** Waktu sekarang (ms) yang diperbarui berkala — untuk hitung mundur & "x menit lalu". */
export function useNow(intervalMs = 60_000): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), intervalMs);

        return () => window.clearInterval(timer);
    }, [intervalMs]);

    return now;
}
