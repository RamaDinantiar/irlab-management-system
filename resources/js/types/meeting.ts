/** File yang bisa diunduh lewat signed URL (StoredFile::toClient). */
export type FileLink = {
    id: number;
    name: string;
    size: number;
    mime: string;
    url: string;
};

/** Pertemuan — sama dengan app/Http/Resources/MeetingResource.php. */
export type MeetingRow = {
    id: number;
    number: number;
    /** "YYYY-MM-DD". */
    date: string;
    topic: string | null;
    responsibleAssistant?: { id: number; name: string } | null;
    startedAt: string | null;
    endedAt: string | null;
    /** Jam mulai & selesai sesi (tanggal pertemuan + jam kelas). */
    startsAt: string;
    endsAt: string;
    /** Jam mulai sudah lewat — presensi dapat diisi. */
    started: boolean;
    /** Sedang dalam jam kelas dan tidak diakhiri lebih awal. */
    running: boolean;
    attendanceCount?: number;
};

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alfa';
