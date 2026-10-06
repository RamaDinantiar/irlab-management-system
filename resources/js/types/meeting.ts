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
    moduleTitle: string | null;
    moduleFile?: FileLink | null;
    moduleReleaseAt: string | null;
    moduleReleased: boolean;
    responsibleAssistant?: { id: number; name: string } | null;
    startedAt: string | null;
    endedAt: string | null;
    /** Dimulai hari ini dan belum diakhiri. */
    running: boolean;
    attendanceCount?: number;
};

export type AttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alfa';
