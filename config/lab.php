<?php

/*
 * Konfigurasi khusus IR Lab (PRD 8.1). Batas ukuran dalam kilobyte.
 * Nilai di sini menjadi default; Admin dapat mengubahnya di Pengaturan Sistem.
 */
return [
    'files' => [
        'disk' => 'lab',

        // NFR-F02: PDF ≤ 10 MB, ZIP ≤ 20 MB, gambar ≤ 5 MB.
        'limits' => [
            'pdf' => 10 * 1024,
            'zip' => 20 * 1024,
            'image' => 5 * 1024,
        ],

        // FR-AT-02: lampiran soal ≤ 20 MB per file, ≤ 5 file.
        'attachment_max' => 20 * 1024,
        'attachment_count' => 5,

        // NFR-F04: masa berlaku signed URL unduhan.
        'url_minutes' => 15,

        // NFR-F05: pemeriksaan ZIP tanpa ekstraksi.
        'zip' => [
            'max_entries' => 500,
            'max_uncompressed' => 100 * 1024 * 1024,
        ],

        // NFR-F07: Code Viewer hanya file teks ≤ 1 MB.
        'code_viewer_max' => 1024 * 1024,
    ],
];
