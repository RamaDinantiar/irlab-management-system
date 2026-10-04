import { Armchair, KeyRound, LogIn } from 'lucide-react';
import { JoinClassDialog } from '@/components/classes/join-class-dialog';
import { Button } from '@/components/ui/button';

const STEPS = [
    {
        icon: KeyRound,
        title: 'Minta kode kelas',
        description:
            'Asisten pengampu membagikan kode 6 karakter untuk kelas praktikum Anda.',
    },
    {
        icon: LogIn,
        title: 'Gabung Kelas',
        description:
            'Klik "Gabung Kelas" lalu masukkan kodenya. Jadwal & tugas langsung muncul.',
    },
    {
        icon: Armchair,
        title: 'Pilih kursi',
        description:
            'Buka menu Seats dan kontrak kursi Anda untuk satu semester.',
    },
];

/** PRD FR-PD: empty state — praktikan belum tergabung ke kelas mana pun. */
export function GettingStarted() {
    return (
        <section
            aria-labelledby="getting-started-title"
            className="border border-dashed border-primary-200 bg-card p-6 md:p-8"
        >
            <h2
                id="getting-started-title"
                className="text-h2 font-bold text-primary-900"
            >
                Mulai praktikum dalam 3 langkah
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
                Anda belum tergabung ke kelas praktikum mana pun.
            </p>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
                {STEPS.map((step, index) => (
                    <li
                        key={step.title}
                        className="flex gap-4 bg-primary-50 p-4"
                    >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-700 font-mono font-bold text-white">
                            {index + 1}
                        </span>
                        <div className="space-y-1">
                            <p className="flex items-center gap-2 font-bold">
                                <step.icon
                                    className="size-4 text-primary-700"
                                    aria-hidden
                                />
                                {step.title}
                            </p>
                            <p className="text-sm">{step.description}</p>
                        </div>
                    </li>
                ))}
            </ol>
            <div className="mt-6">
                <JoinClassDialog
                    trigger={
                        <Button size="lg">
                            <LogIn /> Gabung Kelas
                        </Button>
                    }
                />
            </div>
        </section>
    );
}
