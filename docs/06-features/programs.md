# Program

[← Daftar fitur](README.md)

> **Status: ditutup sementara.** Halaman Program menampilkan "Belum tersedia". Kode dan data tetap ada.
> Aktifkan kembali dengan `LAB_PROGRAMS_ENABLED=true` di `.env` (lalu `php artisan config:cache` di produksi).

| Jenis           | Isi                                                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Workshop**    | Acara dengan pemateri, kuota, biaya internal/eksternal, poster, dan pendaftaran praktikan                                                                                  |
| **Quick Tutor** | Sesi bimbingan singkat dengan pendaftaran                                                                                                                                  |
| **Rekrutmen**   | _Command Center_ asisten baru: form pendaftaran kustom (teks, pilihan, unggah file), tahapan seleksi, penilaian pelamar, ekspor Excel. Pelamar wajib punya akun Praktikan. |
| **Maintenance** | Log perawatan perangkat lab (internal asisten, tanpa pendaftaran)                                                                                                          |

Saat ditutup, program juga disembunyikan dari dashboard dan pencarian global (middleware
`EnsureProgramsAvailable`).

## Kode terkait

`app/Http/Controllers/Asisten/ProgramController.php`, `app/Actions/Program/*`,
`app/Http/Middleware/EnsureProgramsAvailable.php`, `config/lab.php` (`features.programs`).
