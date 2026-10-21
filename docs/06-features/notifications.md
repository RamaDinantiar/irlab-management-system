# Notifikasi, Pengumuman & Pencarian

[← Daftar fitur](README.md)

## Notifikasi lonceng

Notifikasi muncul di ikon lonceng (jumlah belum dibaca) dan di halaman **Notifikasi**.

| Kejadian                                      | Penerima                                          |
| --------------------------------------------- | ------------------------------------------------- |
| Nilai dipublikasikan                          | Praktikan terkait                                 |
| Tugas dibuka, waktu ditambah, atau dihentikan | Praktikan di kelas tersebut                       |
| Pengingat tenggat H-1 (belum mengumpulkan)    | Praktikan (+ **email**)                           |
| Kontrak kursi dikoreksi Admin                 | Praktikan terkait                                 |
| Kelas penuh & terkunci otomatis               | Asisten pengampu                                  |
| Perubahan jadwal kelas/pertemuan              | Praktikan & asisten terkait                       |
| Pengajuan / jawaban tukar shift               | Asisten terkait; Admin saat tukar shift disetujui |
| Laporan mengawas diajukan                     | Sekretaris/Bendahara & Admin                      |
| Laporan diverifikasi / dikembalikan           | Asisten penulis                                   |
| Rekap selesai dibuat                          | Peminta rekap                                     |
| Persetujuan mata kuliah / kelas               | Asisten pengusul                                  |
| Pengumuman terbit                             | Audiens pengumuman                                |

## Email

Email hanya untuk hal penting: **kode OTP reset password**, **password sementara** akun baru/reset Admin,
**verifikasi email** registrasi, dan **pengingat tenggat H-1**. Di lokal (`MAIL_MAILER=log`) email ditulis
ke `storage/logs/laravel.log`.

## Pengumuman

- **Admin**: pengumuman global, dengan target peran tertentu bila perlu.
- **Asisten**: pengumuman untuk kelas yang diampu.
- Dapat **disematkan**, **dijadwalkan** terbit, dan diberi waktu kedaluwarsa. Pengumuman terjadwal
  dinotifikasikan saat terbit (`announcements:notify`, tiap 5 menit).

## Pencarian global

Tekan **Ctrl K** (⌘K di Mac) dari halaman mana pun. Hasil disesuaikan dengan peran:

| Peran     | Yang dicari                                  |
| --------- | -------------------------------------------- |
| Praktikan | Tugas, topik pertemuan                       |
| Asisten   | Praktikan di kelas yang diampu, tugas, kelas |
| Admin     | Pengguna, mata kuliah, kelas, tugas, ruang   |

## Kode terkait

`app/Support/Notifications/Notify.php`, `app/Listeners/SendLabNotifications.php`,
`app/Actions/Announcement/NotifyAnnouncements.php`, `app/Http/Controllers/SearchController.php`.
