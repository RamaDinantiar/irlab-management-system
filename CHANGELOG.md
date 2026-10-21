# Changelog

Semua perubahan penting dicatat di sini. Format mengikuti
[Keep a Changelog](https://keepachangelog.com/id/1.1.0/), dengan versi [SemVer](https://semver.org/lang/id/).

## [Unreleased]

### Ditambahkan

- Reset password dengan **kode OTP 6 digit** ke email kampus (@itpln.ac.id), dibatasi per email+IP dan per IP.
- **Admin tetap untuk produksi** (`AdminSeeder`) dan perintah darurat `php artisan lab:recover-admin`.
- Aturan **minimal satu Admin aktif**: Admin aktif terakhir tidak dapat dinonaktifkan atau diturunkan perannya.
- Panel **Sesi Berlangsung** di dashboard Asisten & Praktikan (diperbarui tiap 20–30 detik).
- Topik per pertemuan (menggantikan unggah modul), warna mata kuliah, nomor telepon & foto profil.
- Header keamanan HTTP (CSP, HSTS, `nosniff`, `frame-ancestors`).
- Dokumentasi lengkap di `docs/` beserta screenshot, `LICENSE`, dan `CHANGELOG`.
- PRD diperbarui ke **v2.0** sesuai aplikasi yang sudah dibangun (`docs/02-prd.md`).
- Template `.env.production.example`.

### Diubah

- Reset password oleh Admin kini mengakhiri semua sesi akun tersebut.
- Audit log tidak lagi menyimpan nilai token kelas.
- Seeder demo hanya berjalan di `APP_ENV=local`/`testing`.
- Bahasa bawaan aplikasi `id`; semua tanggal ditampilkan dalam WIB.

### Diperbaiki

- Impor pengguna dari Excel tidak lagi gagal bila ada sel bertipe tanggal.
- ZIP rusak ditolak dengan pesan yang jelas.
- Test dengan "boleh terlambat" tetap tampil di panel sesi setelah tenggat.
- PHPStan (Larastan level 7): 219 → 0 error.

## [0.3.0] - 2026-10-06

### Diubah

- Satu ruang lab (Lab IR): seeder, contoh teks, dan form tanpa pilihan ruang.
- Pre/Post-Test: mode **Sesi Berjalan** (jam saja) dan alokasi kelas wajib.
- Tombol **Akhiri Sesi** dan deteksi sesi berjalan berdasarkan waktu mulai.
- Task Asisten mengikuti desain Figma: kartu per kelas, aksi cepat, pop-up Buat Tugas.
- Pendaftaran mandiri: jurusan berupa dropdown (S1 TI & S1 SI).
- Penyempurnaan sidebar, kartu dashboard, dan halaman 403.

## [0.2.0] - 2026-10-05

### Ditambahkan

- Task Management & pengumpulan tugas.
- Grade: tabel nilai batch, Split-Screen Review, publikasi, rekap praktikan.
- Seats: editor denah, kontrak kursi praktikan, koreksi Admin.
- Schedule & tukar shift, Laporan Mengawas, Generate rekap + honor.
- Notifikasi lonceng & pengumuman.
- Audit log, Pengaturan Sistem, dashboard Admin.
- Program: Workshop, Quick Tutor, Rekrutmen, Maintenance (saat ini ditutup lewat `LAB_PROGRAMS_ENABLED`).
- Pencarian global (Ctrl K), ekspor & impor anggota kelas.
- Pendaftaran mandiri praktikan khusus email kampus.

## [0.1.0] - 2026-10-04

### Ditambahkan

- Fondasi aplikasi: autentikasi, RBAC + jabatan, master data Admin, kelas & token, persetujuan, enrollment.
- Penyimpanan file aman, pertemuan, sesi kelas, dan presensi.
