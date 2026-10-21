# Administrasi

[← Daftar fitur](README.md)

![Pengguna](../images/admin-users.jpg)

## Semester

- Status: **Draft → Aktif → Arsip**. Hanya satu semester aktif; seluruh menu memakai semester aktif.
- **Salin struktur** dari semester sebelumnya: mata kuliah & bobot nilai (tanpa kelas, asisten, praktikan, dan nilai). Mata kuliah dengan kode yang sudah ada dilewati.

## Master data

| Menu           | Isi                                                                                                      |
| -------------- | -------------------------------------------------------------------------------------------------------- |
| Mata Kuliah    | Kode, nama, SKS, **warna**, bobot Pre-Test/Post-Test/Laporan; setujui/tolak usulan asisten               |
| Kelas & Jadwal | Hari, jam, ruang, kuota, asisten pengampu, **nama dosen** (tampil di laporan Word); setujui/tolak usulan |
| Ruang & Denah  | Ukuran grid & editor denah (lihat [Tempat Duduk](seats.md))                                              |
| Kontrak Kursi  | Pindah/hapus kontrak kursi praktikan                                                                     |
| Pengumuman     | Pengumuman global (lihat [Notifikasi](notifications.md))                                                 |

## Pengguna

- Tambah satu per satu, atau **impor CSV/Excel** dari template (kolom NIM, Nama, Email, Jurusan, Angkatan).
  Baris yang gagal dilaporkan beserta alasannya.
- Akun baru menerima **password sementara** lewat email dan wajib menggantinya saat login pertama.
- Atur **peran** dan **jabatan** (Sekretaris/Bendahara). Perubahan tercatat di audit log.
- **Reset password**: password sementara baru dan semua sesi akun diakhiri.
- **Nonaktifkan** akun: semua sesi berakhir seketika; data tetap tersimpan.
- Pengaman: Admin tidak dapat menonaktifkan/menurunkan dirinya sendiri, dan Admin aktif terakhir tidak dapat
  dinonaktifkan/diturunkan.

## Audit log

![Audit log](../images/admin-audit.jpg)

Mencatat aksi sensitif dengan pelaku, objek, data **sebelum & sesudah**, dan IP: nilai, kontrak kursi,
peran/jabatan, semester, persetujuan, verifikasi laporan, tarif & rekap honor, reset password,
pembukaan kunci laporan, dan lain-lain. Dapat difilter berdasarkan modul, pelaku, dan rentang tanggal.

## Pengaturan sistem

![Pengaturan sistem](../images/admin-settings.jpg)

| Pengaturan                      | Bawaan                         |
| ------------------------------- | ------------------------------ |
| Batas idle sesi                 | 30 menit                       |
| Batas unggah PDF / ZIP / gambar | 10 / 20 / 5 MB                 |
| Registrasi mandiri praktikan    | Dibuka                         |
| Domain email registrasi         | `itpln.ac.id`                  |
| Tarif honor per jam             | Berlaku mulai tanggal tertentu |

## Kode terkait

`app/Http/Controllers/Admin/*`, `app/Actions/User/*`, `app/Actions/Semester/CopySemesterStructure.php`,
`app/Models/Setting.php`, `app/Models/AuditLog.php`.
