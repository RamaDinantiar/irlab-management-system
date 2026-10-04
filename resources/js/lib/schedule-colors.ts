import type { ScheduleColor } from '@/types';

/**
 * Warna blok jadwal per mata kuliah — Figma "Dashboard" (Schedule).
 * Teks merah, oranye & kuning digelapkan dari Figma (#b5180f, #ce7d0b, #c29b00)
 * agar ≥ 4.5:1 juga di atas chip jam.
 */
export const scheduleColors: Record<
    ScheduleColor,
    {
        block: string;
        accent: string;
        chip: string;
        text: string;
        running: string;
    }
> = {
    red: {
        block: 'bg-[#ffd4d1]',
        accent: 'border-l-[#ff3b2f]',
        chip: 'bg-[#ffa4b2]',
        text: 'text-[#8f1209]',
        running: 'border-[#ff3b2f] bg-[#fff7f6] text-[#8f1209]',
    },
    green: {
        block: 'bg-[#c4fdce]',
        accent: 'border-l-[#01a020]',
        chip: 'bg-[#82f294]',
        text: 'text-[#016c12]',
        running: 'border-[#01a020] bg-[#effff1] text-[#016c12]',
    },
    orange: {
        block: 'bg-[#ffe6c3]',
        accent: 'border-l-[#fe9603]',
        chip: 'bg-[#ffcd86]',
        text: 'text-[#8a4b00]',
        running: 'border-[#fe9603] bg-[#fff8ee] text-[#8a4b00]',
    },
    yellow: {
        block: 'bg-[#ffeda5]',
        accent: 'border-l-[#ffcc01]',
        chip: 'bg-[#fede5e]',
        text: 'text-[#6b5400]',
        running: 'border-[#ffcc01] bg-[#fffbea] text-[#6b5400]',
    },
    blue: {
        block: 'bg-[#cee5ff]',
        accent: 'border-l-[#017aff]',
        chip: 'bg-[#7fbcff]',
        text: 'text-[#004592]',
        running: 'border-[#017aff] bg-[#f1f8ff] text-[#004592]',
    },
    // Shift ngawas: warna brand, agar beda dari sesi kelas.
    teal: {
        block: 'bg-primary-50',
        accent: 'border-l-primary-700',
        chip: 'bg-primary-200',
        text: 'text-primary-900',
        running: 'border-primary bg-white text-primary-900',
    },
};
