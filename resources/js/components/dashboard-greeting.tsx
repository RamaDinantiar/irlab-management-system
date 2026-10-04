import { usePage } from '@inertiajs/react';

/** Figma "Dashboard": "Halo, Michael! Selamat datang di Dashboard IR Lab." */
export function DashboardGreeting() {
    const { auth } = usePage().props;
    const firstName = auth.user?.name.split(' ')[0];

    return (
        <h1 className="text-h1 font-bold text-primary-700">
            Halo, {firstName}!
            <br />
            Selamat datang di Dashboard IR Lab.
        </h1>
    );
}
