# 10 · Keamanan

[← Kembali ke README](../README.md)

Ringkasan kontrol keamanan yang **sudah diterapkan**. Rencana yang belum aktif ditandai jelas.

## Autentikasi & sesi

| Kontrol            | Rincian                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kebijakan password | Min. 8 karakter, kombinasi huruf & angka. Disimpan dengan hash bcrypt.                                                                                        |
| Password sementara | Akun buatan/impor Admin wajib mengganti password saat login pertama.                                                                                          |
| Batas login        | 5 percobaan per menit per kombinasi NIM/email + IP.                                                                                                           |
| Reset password     | **Kode OTP 6 digit** ke email kampus. Kode di-hash, berlaku 10 menit, maks. 5 kali percobaan, kirim ulang setelah 60 detik. Dibatasi per email+IP dan per IP. |
| Sesi               | Batas idle **30 menit** (dapat diatur Admin), dengan peringatan di frontend dan _keep-alive_ saat aktif.                                                      |
| Akhiri sesi        | Ganti password → sesi di perangkat lain diakhiri. Reset oleh Admin atau penonaktifan akun → **semua** sesi diakhiri dan token _Remember Me_ diganti.          |
| Registrasi mandiri | Hanya email berdomain kampus (dapat ditutup Admin) + verifikasi email.                                                                                        |

## Otorisasi

- Middleware peran pada setiap grup route. Akses ke URL peran lain menghasilkan 403.
- Pengecekan kepemilikan di controller/action, misalnya kelas yang diampu dan submission milik sendiri.
  Test otomatis mencakup akses ke area peran lain dan ke kelas yang tidak diampu.
- Admin aktif terakhir tidak dapat dinonaktifkan atau diturunkan perannya. Ada jalur pemulihan darurat
  `lab:recover-admin` yang hanya bisa dijalankan dari server.

Detail di [05 · Peran & hak akses](05-roles-permissions.md).

## File unggahan

| Kontrol         | Rincian                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Validasi ganda  | Ekstensi **dan** MIME asli dari isi file (`finfo`), bukan dari header browser. Daftar putih: PDF, ZIP, JPG, PNG.           |
| Batas ukuran    | PDF 10 MB, ZIP 20 MB, gambar 5 MB (dapat diatur Admin), juga dibatasi di `php.ini`/web server.                             |
| Pemeriksaan ZIP | Tanpa ekstraksi: tolak path traversal (`../`, path absolut), symlink, > 500 entri, isi > 100 MB (zip bomb), dan ZIP rusak. |
| Penyimpanan     | Disk privat `storage/app/private/lab` di luar web root; nama file UUID; nama asli hanya di database.                       |
| Integritas      | Checksum **SHA-256** setiap file disimpan.                                                                                 |
| Akses           | Hanya lewat **URL bertanda tangan** berumur 15 menit, dengan `X-Content-Type-Options: nosniff`.                            |
| Code Viewer     | Hanya file teks ≤ 1 MB; kode tidak pernah dijalankan.                                                                      |
| Antivirus       | _Belum aktif._ Kolom `scan_status` sudah disiapkan untuk ClamAV; file berstatus selain `clean` tidak dapat diunduh.        |

## Aplikasi

- **Header HTTP**: `Content-Security-Policy` (`frame-ancestors`, `base-uri`, `form-action`, `object-src`),
  `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, dan
  `Strict-Transport-Security` di HTTPS.
- Proteksi bawaan Laravel: CSRF, Eloquent/query builder (anti SQL injection), escaping output React.
- **Rate limiting** untuk login, reset password, token gabung kelas (5 kali gagal), pengumpulan tugas, kontrak
  kursi, pencarian, dan unduhan laporan.
- Ekspor CSV aman dari **formula injection**: sel yang diawali `= + - @` diberi tanda kutip.
- Tautan notifikasi hanya mengarah ke path internal (`SafeRedirect`), mencegah _open redirect_.

## Audit log

Aksi sensitif dicatat di `audit_logs` beserta pelaku, objek, data **sebelum & sesudah**, dan IP: nilai,
kontrak kursi, peran/jabatan, semester, persetujuan kelas/mata kuliah, verifikasi & pembukaan kunci laporan,
tarif & rekap honor, reset password, pemulihan Admin. Data rahasia seperti token kelas dan password **tidak**
ikut dicatat.

## Rahasia & lingkungan

- `.env` dan semua `.env.*` (kecuali template `*.example`) diabaikan git; simpan dengan `chmod 600`.
- Produksi memakai [`.env.production.example`](../.env.production.example): `APP_DEBUG=false`,
  `LOG_LEVEL=warning`, SMTP, `SESSION_ENCRYPT=true`, `SESSION_SECURE_COOKIE=true`, dan `APP_KEY` baru.
- Di produksi, **perintah database destruktif diblokir** (`migrate:fresh`, `db:wipe`, …).
- Seeder demo (akun berkata sandi `password`) dan route `/dev/*` hanya aktif di `APP_ENV=local`.
- Selama `MAIL_MAILER=log`, kode OTP & password sementara tertulis di `storage/logs/laravel.log`. Kosongkan
  log itu secara berkala di lingkungan lokal.

## Pelaporan masalah keamanan

Jangan membuka issue publik. Hubungi pengelola IR Lab ITPLN secara langsung melalui email
<labsimpel@itpln.ac.id> atau pengembang di <ramadinantiar12@gmail.com>.
