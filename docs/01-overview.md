# 01 · Gambaran Umum

[← Kembali ke README](../README.md)

## Visi

Menjadikan IR Lab laboratorium yang **100% paperless**, di mana setiap praktikum, penilaian, dan kegiatan
asisten tercatat, terlacak, dan dapat diaudit dalam satu sistem.

## Latar belakang

Sebelum sistem ini ada:

| Kegiatan            | Cara lama                 | Masalah                                             |
| ------------------- | ------------------------- | --------------------------------------------------- |
| Pengumpulan tugas   | Email, Google Form, drive | Tersebar; praktikan tidak tahu tugas sudah diterima |
| Penilaian           | Spreadsheet manual        | Rekap lambat (± 7 hari), rawan salah salin          |
| Laporan mengawas    | Kertas                    | Rekap bulanan ± 3 jam per asisten, sulit diaudit    |
| Tukar shift         | Grup chat                 | Tidak ada jejak persetujuan                         |
| Tempat duduk        | Ditentukan saat kelas     | Tidak tercatat, sering berubah                      |
| Pergantian semester | Input ulang               | Data semester lama bercampur                        |

## Tujuan

1. **Sentralisasi akademik**: seluruh pengumpulan tugas dan penilaian praktikum terjadi di dalam sistem.
2. **Efisiensi asisten**: waktu koreksi dan pembuatan laporan dipangkas lewat Split-Screen Grade, simpan
   nilai batch, dan rekap otomatis.
3. **Transparansi praktikan**: jadwal, tenggat, nilai, dan feedback selalu terlihat.
4. **Administrasi per semester**: data terstruktur per semester; struktur semester lama dapat disalin.

### Target KPI (1 semester setelah go-live)

| KPI                                           | Target    |
| --------------------------------------------- | --------- |
| Tugas dikumpulkan via sistem                  | ≥ 95%     |
| Median waktu submit → nilai terbit            | ≤ 3 hari  |
| Waktu menyusun rekap laporan mengawas bulanan | ≤ 5 menit |
| Laporan mengawas tercatat di hari yang sama   | ≥ 90%     |
| Praktikan aktif mingguan                      | ≥ 85%     |

## Pengguna

| Peran           | Profil                                                      | Kebutuhan utama                                                  |
| --------------- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| **Praktikan**   | Mahasiswa, 1–3 kelas praktikum per semester, dominan mobile | Tahu jadwal, kumpulkan tugas tepat waktu, lihat nilai & feedback |
| **Asisten Lab** | Mahasiswa senior, mengampu 2–4 kelas, 2–6 shift per minggu  | Menilai cepat, laporan tidak makan waktu, jadwal jelas           |
| **Admin**       | Koordinator/Kepala Lab                                      | Data rapi per semester, kontrol penuh, audit mudah               |

Asisten dapat diberi jabatan **Sekretaris/Bendahara** untuk memverifikasi laporan mengawas dan menyetujui
rekap honor. Lihat [05 · Peran & hak akses](05-roles-permissions.md).

## Ruang lingkup

**Termasuk:** login & pemulihan akun, dashboard tiga peran, kelas & enrollment, jadwal & sesi, presensi,
tugas & pengumpulan, penilaian, kontrak kursi, laporan mengawas, rekap bulanan & honor, tukar shift,
notifikasi, pengumuman, audit log, pengaturan sistem.

**Ditutup sementara:** modul Program (Workshop, Quick Tutor, Rekrutmen, Maintenance). Kode & data tetap ada
dan aktif kembali dengan `LAB_PROGRAMS_ENABLED=true`.

**Di luar cakupan** (kandidat pasca-MVP): kuis pilihan ganda otomatis, auto-grader kode, deteksi plagiarisme,
presensi QR, SSO kampus & 2FA, notifikasi WhatsApp/Telegram, multi-peran per akun, integrasi SIAKAD,
aplikasi mobile native.

## Istilah

| Istilah          | Arti                                                                            |
| ---------------- | ------------------------------------------------------------------------------- |
| Kelas            | Satu rombongan praktikum sebuah mata kuliah pada hari & jam tertentu            |
| Pertemuan        | Satu sesi kelas bernomor (P1, P2, …) dengan topik                               |
| Sesi berjalan    | Pertemuan yang sedang berlangsung sesuai jam kelas; dimulai & diakhiri otomatis |
| Target tugas     | Penerbitan satu tugas ke satu kelas, dengan waktu buka & tenggat sendiri        |
| Laporan mengawas | Laporan asisten jaga untuk satu shift                                           |
| Kontrak kursi    | Penempatan kursi praktikan di satu kelas selama satu semester                   |
