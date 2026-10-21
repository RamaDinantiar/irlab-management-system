import type { ScheduleColor } from '@/types';

/**
 * Warna blok jadwal per mata kuliah — Figma "Dashboard" (Schedule).
 * Warna tiap mata kuliah dipilih Admin (`courses.color`, app/Support/CourseColor.php).
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
        /** Titik legenda (warna aksen). */
        dot: string;
    }
> = {
    red: {
        block: 'bg-[#ffd4d1]',
        accent: 'border-l-[#ff3b2f]',
        dot: 'bg-[#ff3b2f]',
        chip: 'bg-[#ffa4b2]',
        text: 'text-[#8f1209]',
        running: 'border-[#ff3b2f] bg-[#fff7f6] text-[#8f1209]',
    },
    green: {
        block: 'bg-[#c4fdce]',
        accent: 'border-l-[#01a020]',
        dot: 'bg-[#01a020]',
        chip: 'bg-[#82f294]',
        text: 'text-[#016c12]',
        running: 'border-[#01a020] bg-[#effff1] text-[#016c12]',
    },
    orange: {
        block: 'bg-[#ffe6c3]',
        accent: 'border-l-[#fe9603]',
        dot: 'bg-[#fe9603]',
        chip: 'bg-[#ffcd86]',
        text: 'text-[#8a4b00]',
        running: 'border-[#fe9603] bg-[#fff8ee] text-[#8a4b00]',
    },
    yellow: {
        block: 'bg-[#ffeda5]',
        accent: 'border-l-[#ffcc01]',
        dot: 'bg-[#ffcc01]',
        chip: 'bg-[#fede5e]',
        text: 'text-[#6b5400]',
        running: 'border-[#ffcc01] bg-[#fffbea] text-[#6b5400]',
    },
    blue: {
        block: 'bg-[#cee5ff]',
        accent: 'border-l-[#017aff]',
        dot: 'bg-[#017aff]',
        chip: 'bg-[#7fbcff]',
        text: 'text-[#004592]',
        running: 'border-[#017aff] bg-[#f1f8ff] text-[#004592]',
    },
    purple: {
        block: 'bg-[#f1dcfb]',
        accent: 'border-l-[#af52de]',
        dot: 'bg-[#af52de]',
        chip: 'bg-[#dcb0f3]',
        text: 'text-[#6b1f94]',
        running: 'border-[#af52de] bg-[#fbf5fe] text-[#6b1f94]',
    },
    // Pink, cyan, cokelat & lime: tambahan untuk mata kuliah di luar legenda Figma.
    pink: {
        block: 'bg-[#ffe4f1]',
        accent: 'border-l-[#ff7ab8]',
        dot: 'bg-[#ff7ab8]',
        chip: 'bg-[#ffc0de]',
        text: 'text-[#8c0f4e]',
        running: 'border-[#ff7ab8] bg-[#fff6fa] text-[#8c0f4e]',
    },
    cyan: {
        block: 'bg-[#d2f4fa]',
        accent: 'border-l-[#12b0cc]',
        dot: 'bg-[#12b0cc]',
        chip: 'bg-[#8fe0ee]',
        text: 'text-[#035868]',
        running: 'border-[#12b0cc] bg-[#f2fcfe] text-[#035868]',
    },
    brown: {
        block: 'bg-[#efe5d8]',
        accent: 'border-l-[#a2845e]',
        dot: 'bg-[#a2845e]',
        chip: 'bg-[#d9c4a6]',
        text: 'text-[#5a4126]',
        running: 'border-[#a2845e] bg-[#fbf8f4] text-[#5a4126]',
    },
    lime: {
        block: 'bg-[#eaf7d4]',
        accent: 'border-l-[#8cc63f]',
        dot: 'bg-[#8cc63f]',
        chip: 'bg-[#c8ea94]',
        text: 'text-[#3d5c0b]',
        running: 'border-[#8cc63f] bg-[#f8fdf0] text-[#3d5c0b]',
    },
    // Shift ngawas: warna brand, agar beda dari sesi kelas.
    teal: {
        block: 'bg-primary-50',
        accent: 'border-l-primary-700',
        dot: 'bg-primary-700',
        chip: 'bg-primary-200',
        text: 'text-primary-900',
        running: 'border-primary bg-white text-primary-900',
    },
};

/** Pilihan warna mata kuliah untuk Admin (urutan = legenda Figma). */
export const courseColorOptions: { value: ScheduleColor; label: string }[] = [
    { value: 'red', label: 'Merah' },
    { value: 'orange', label: 'Oranye' },
    { value: 'yellow', label: 'Kuning' },
    { value: 'green', label: 'Hijau' },
    { value: 'blue', label: 'Biru' },
    { value: 'purple', label: 'Ungu' },
    { value: 'pink', label: 'Pink' },
    { value: 'cyan', label: 'Cyan' },
    { value: 'brown', label: 'Cokelat' },
    { value: 'lime', label: 'Lime' },
];
