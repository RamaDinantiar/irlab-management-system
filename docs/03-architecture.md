# 03 · Arsitektur

[← Kembali ke README](../README.md)

IR Lab adalah **monolit Laravel** dengan antarmuka **React yang dirender lewat Inertia**. Tidak ada API
terpisah: controller Laravel mengembalikan halaman Inertia beserta props-nya, dan React merender di browser.
Satu basis kode, satu deploy, tanpa sinkronisasi skema API.

## Gambaran komponen

```mermaid
flowchart LR
    subgraph Browser
        R[React 19 + Inertia<br/>TypeScript, Tailwind]
    end

    subgraph Server["Server (PHP 8.3+)"]
        MW[Middleware<br/>auth · role · aktif · ganti password<br/>header keamanan]
        C[Controller per peran<br/>Admin / Asisten / Praktikan]
        A[Actions<br/>logika bisnis]
        S[Support<br/>dashboard, seats, report, grading]
        EV[Events & Listeners]
        Q[(Queue worker)]
        SCH[Scheduler]
    end

    DB[(MySQL 8)]
    FS[(Disk privat<br/>storage/app/private/lab)]
    MAIL[SMTP<br/>Office 365]

    R -- "request Inertia / form" --> MW --> C
    C --> A --> DB
    C --> S --> DB
    A --> EV --> Q
    A --> FS
    Q --> MAIL
    Q --> FS
    SCH --> A
    C -- "props JSON" --> R
```

## Struktur kode

| Lokasi                                           | Isi                                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `routes/web.php`                                 | Login, lupa password (OTP), pencarian, file bertanda tangan, pengelompokan route per peran      |
| `routes/{admin,asisten,praktikan,settings}.php`  | Route tiap peran (prefix `/admin`, `/asisten`, `/praktikan`)                                    |
| `routes/console.php`                             | Perintah Artisan & jadwal (scheduler)                                                           |
| `app/Http/Controllers/{Admin,Asisten,Praktikan}` | Controller tipis: validasi, otorisasi kepemilikan, render Inertia                               |
| `app/Actions/<Domain>`                           | Logika bisnis yang dipakai ulang (mis. `JoinClass`, `SubmitTask`, `PublishGrades`, `SwapShift`) |
| `app/Support`                                    | Penyusun data halaman: dashboard, denah kursi, rekap, antrean penilaian                         |
| `app/Events`, `app/Listeners`                    | Efek samping: notifikasi, pembukaan Pre-Test otomatis                                           |
| `app/Jobs/GenerateMonthlyReport`                 | Pembuatan rekap bulanan (Word ZIP / Excel) di antrean                                           |
| `resources/js/pages`                             | Halaman Inertia per peran                                                                       |
| `resources/js/components`                        | Komponen bersama (picker tanggal/jam, denah kursi, PDF viewer, dsb.)                            |
| `resources/js/actions`, `routes`                 | Dibuat otomatis oleh **Wayfinder**: route Laravel bertipe di TypeScript                         |

## Alur request

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser (React)
    participant M as Middleware
    participant C as Controller
    participant A as Action
    participant D as MySQL

    B->>M: GET /asisten/grade (X-Inertia)
    M->>M: auth · role:asisten,admin · akun aktif · password sudah diganti
    M->>C: request
    C->>C: cek kelas diampu (isTaughtBy)
    C->>D: query + eager loading
    C-->>B: komponen "asisten/grade" + props
    B->>M: PATCH /asisten/grades/batch
    M->>C: request
    C->>A: simpan batch nilai (transaksi)
    A->>D: update grades + audit_logs
    C-->>B: redirect back + toast
```

Otorisasi berlapis:

1. **Middleware peran** (`role:`) di setiap grup route; akses ke URL peran lain menghasilkan 403.
2. **Pengecekan kepemilikan** di controller/action, misalnya asisten hanya boleh mengelola kelas yang diampu
   (`LabClass::isTaughtBy`) dan praktikan hanya boleh melihat submission miliknya.
3. Front-end hanya menyembunyikan menu, **bukan** lapisan keamanan.

## Proses latar belakang

```mermaid
flowchart TB
    subgraph Scheduler["Scheduler (schedule:run tiap menit)"]
        M1[meetings:sync<br/>tiap menit]
        M2[announcements:notify<br/>tiap 5 menit]
        M3[tasks:remind-deadlines<br/>tiap jam]
        M4[shifts:expire-swaps<br/>tiap jam]
        M5[exports:prune<br/>harian]
    end

    M1 -- "sesi mulai" --> E1((MeetingStarted)) --> L1[OpenScheduledPretests<br/>buka Pre-Test]
    M2 --> N[Notifikasi lonceng]
    M3 --> N
    M3 --> EM[Email H-1]

    subgraph Queue["Queue worker"]
        J[GenerateMonthlyReport<br/>Word ZIP / Excel]
        CRED[Email password sementara]
    end

    J -- "selesai" --> E2((ExportFinished)) --> N
```

| Proses       | Pemicu                                    | Tanpa proses ini                                                                     |
| ------------ | ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Scheduler    | Cron `* * * * * php artisan schedule:run` | Sesi tidak mulai/berhenti otomatis, Pre-Test tidak terbuka, pengingat tidak terkirim |
| Queue worker | `php artisan queue:work` (Supervisor)     | Rekap tertahan "Antre", email password sementara tidak terkirim                      |

Saat ada pengguna membuka dashboard atau halaman sesi, sinkronisasi sesi juga dijalankan (dibatasi
sekali per 20 detik), sehingga status tetap tepat walau scheduler terlambat.

## Penyimpanan file

```mermaid
flowchart LR
    U[Unggahan] --> V{Validasi FileStore<br/>ekstensi + MIME asli<br/>ukuran · isi ZIP}
    V -- lolos --> P[Disk privat 'lab'<br/>nama UUID + SHA-256]
    V -- gagal --> X[Ditolak dengan pesan]
    P --> T[(tabel files)]
    T --> SU[Signed URL 15 menit]
    SU --> F[FileController<br/>cek scan_status + nosniff]
```

- Semua file (submission, lampiran soal, foto laporan, avatar, hasil ekspor) disimpan di
  `storage/app/private/lab`, **di luar web root**.
- Nama asli hanya disimpan di database; nama di disk berupa UUID.
- File hanya bisa diunduh lewat **URL bertanda tangan** yang berlaku 15 menit.

Detail di [10 · Keamanan](10-security.md).

## Frontend

- **Inertia 3** menghubungkan route Laravel ke halaman React tanpa API terpisah. Props dikirim sebagai JSON;
  polling parsial (`usePoll`, `only: [...]`) memperbarui bagian tertentu saja, misalnya panel sesi berlangsung.
- **Wayfinder** membuat fungsi route & action bertipe dari controller Laravel, sehingga URL tidak ditulis manual.
- Komponen UI di atas **Radix UI** + Tailwind 4. Dropdown & tanggal selalu memakai `SelectField`,
  `DateField`, `TimeField`, dan `CalendarFilter`, tidak memakai input bawaan browser.
- Semua waktu ditampilkan dalam **WIB** (`resources/js/lib/datetime.ts`).

## Kualitas

| Alat               | Cakupan                                                       |
| ------------------ | ------------------------------------------------------------- |
| PHPUnit            | 299 feature/unit test (SQLite in-memory)                      |
| PHPStan + Larastan | Level 7, 0 error, tanpa baseline                              |
| Pint               | Gaya kode PHP                                                 |
| Vite+ (`vp check`) | Format & lint TypeScript/CSS/Markdown                         |
| `tsc --noEmit`     | Type-check TypeScript                                         |
| GitHub Actions     | `composer ci:check` di setiap push ke `main` dan pull request |
