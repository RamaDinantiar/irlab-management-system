# Tempat Duduk

[← Daftar fitur](README.md)

![Editor denah](../images/admin-room-layout.jpg)

## Denah ruang (Admin)

- Ruang lab berupa grid **baris × kolom**. Setiap sel bertipe **kursi** (`seat`), **meja asisten**
  (`assistant_desk`), **lorong** (`aisle`), atau **nonaktif** (`disabled`).
- Denah bawaan meniru tata letak lab: lorong di tengah, meja asisten di depan, nomor kursi berkelok
  (`PC-01`, `PC-02`, …). Label dapat dinomori ulang.
- Saat ini ada satu ruang, **Lab IR**; struktur data mendukung banyak ruang.

## Kontrak kursi (Praktikan)

![Kontrak tempat duduk](../images/praktikan-seats.jpg)

- Praktikan memilih kursi dari denah untuk **setiap kelas** yang diikuti. Kursi tersebut berlaku selama satu
  semester.
- Satu kursi hanya untuk satu praktikan di kelas yang sama. Pemilihan kursi memakai transaksi dan row locking
  agar dua orang tidak mendapat kursi yang sama.
- Kontrak menyimpan **snapshot** nama, NIM, dan jurusan saat kontrak dibuat.
- Kursi pada denah: milik sendiri, terisi, dan kosong.

## Peran lain

- **Asisten** melihat denah kelas yang diampu beserta penghuni setiap kursi (nama, NIM, email, telepon, foto).
- **Admin** dapat memindahkan atau menghapus kontrak untuk koreksi. Praktikan diberi notifikasi dan perubahan
  tercatat di audit log.

## Kode terkait

`app/Support/Seats/RoomLayout.php`, `SeatMapData.php`, `app/Http/Controllers/Praktikan/SeatController.php`,
`app/Http/Controllers/Admin/SeatContractController.php`, `RoomController.php`.
