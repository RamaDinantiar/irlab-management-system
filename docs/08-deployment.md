# 08 · Deployment Produksi

[← Kembali ke README](../README.md)

Urutan langkah memasang IR Lab di server produksi. Centang tiap butir saat dikerjakan.
Untuk instalasi di komputer sendiri, lihat [07 · Instalasi](07-installation.md).

## 1. Kebutuhan server

- [ ] PHP 8.3+ dengan ekstensi: `pdo_mysql`, `mbstring`, `xml`, `dom`, `fileinfo`, `zip`, `gd`, `intl`
- [ ] MySQL 8 (buat database & user khusus, bukan `root`)
- [ ] Composer 2; Node.js 20+ hanya untuk build aset (boleh di mesin lain)
- [ ] HTTPS aktif (sertifikat, mis. Let's Encrypt)
- [ ] Batas unggah PHP & web server minimal 25 MB (ZIP submission & lampiran maks. 20 MB):
    - `php.ini`: `upload_max_filesize = 25M`, `post_max_size = 25M`
    - Nginx: `client_max_body_size 25M;`
- [ ] Document root web server menunjuk ke folder `public/` (bukan ke root proyek)

## 2. File `.env` produksi

Salin dari [`.env.production.example`](../.env.production.example) (sudah berisi nilai aman untuk produksi), lalu isi
nilai yang kosong. Bagian terpenting:

```dotenv
APP_ENV=production          # WAJIB: route /dev/login-as hanya aktif bila local
APP_DEBUG=false             # WAJIB: tanpa ini detail error & kode tampil ke pengunjung
APP_URL=https://<domain-lab>
LOG_LEVEL=warning

DB_DATABASE=ir_lab
DB_USERNAME=<user-khusus>
DB_PASSWORD=<kata-sandi-kuat>

SESSION_DRIVER=database
SESSION_LIFETIME=30
SESSION_SECURE_COOKIE=true  # cookie sesi hanya lewat HTTPS

QUEUE_CONNECTION=database

MAIL_MAILER=smtp            # lokal memakai "log"; produksi harus SMTP sungguhan
MAIL_HOST=...
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=...
MAIL_FROM_NAME="IR Lab"
```

- [ ] `php artisan key:generate` (sekali saja, saat pemasangan pertama)
- [ ] `chmod 600 .env`; pastikan `.env` tidak bisa diakses dari browser dan tidak ikut ke git

Email dipakai untuk: kode OTP reset password, password sementara akun baru/impor, verifikasi email
registrasi, dan pengingat tenggat H-1.

## 3. Pasang kode

```bash
composer install --no-dev --optimize-autoloader
npm ci && npm run build          # atau salin folder public/build hasil build
php artisan migrate --force      # JANGAN migrate:fresh — menghapus semua data
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

- [ ] Folder `storage/` dan `bootstrap/cache/` dapat ditulis oleh user web server
- [ ] Buat akun Admin tetap: isi `ADMIN_NAME` & `ADMIN_EMAIL` di `.env` (biarkan
      `ADMIN_PASSWORD` kosong agar dibuatkan acak), lalu:

```bash
php artisan config:clear
php artisan db:seed --class=AdminSeeder --force
php artisan config:cache
```

Kata sandi sementara tampil sekali di terminal dan wajib diganti saat login pertama.
Bila memakai `ADMIN_PASSWORD` (min. 12 karakter, huruf besar-kecil & angka), hapus dari
`.env` setelahnya. Menjalankan ulang aman: akun yang sudah ada tidak diubah.

- [ ] Data & akun demo (`admin@irlab.test`, kata sandi `password`) **tidak bisa** dibuat di
      produksi: seeder demo menolak jalan di luar `APP_ENV=local`/`testing`, dan
      `db:seed` biasa di produksi hanya membuat Admin tetap di atas.

Setelah itu akun lain dibuat/diimpor dari menu Admin › Pengguna.

## 4. Proses latar belakang (wajib)

### Antrean (queue worker)

Tanpa ini, **ekspor ZIP/Excel tertahan di status "Antre"** dan **email password
sementara tidak terkirim**. Jalankan terus-menerus lewat Supervisor:

```ini
; /etc/supervisor/conf.d/ir-lab-worker.conf
[program:ir-lab-worker]
command=php /var/www/ir-lab/artisan queue:work --sleep=3 --tries=1 --timeout=320
user=www-data
autostart=true
autorestart=true
stopwaitsecs=330
stdout_logfile=/var/www/ir-lab/storage/logs/worker.log
```

`--timeout` harus lebih besar dari batas job rekap (300 detik).

- [ ] `supervisorctl reread && supervisorctl update && supervisorctl start ir-lab-worker`
- [ ] Setiap kali deploy kode baru: `php artisan queue:restart`

### Penjadwal (cron)

Menjalankan tugas otomatis. Tanpa cron, **sesi kelas tidak mulai/berhenti sendiri** dan Pre-Test tidak terbuka.

| Perintah                 | Jadwal       | Fungsi                                            |
| ------------------------ | ------------ | ------------------------------------------------- |
| `meetings:sync`          | tiap menit   | Mulai/akhiri sesi sesuai jam kelas, buka Pre-Test |
| `announcements:notify`   | tiap 5 menit | Notifikasi pengumuman terjadwal                   |
| `tasks:remind-deadlines` | tiap jam     | Pengingat tenggat H-1 (lonceng + email)           |
| `shifts:expire-swaps`    | tiap jam     | Kedaluwarsakan pengajuan tukar shift              |
| `exports:prune`          | harian       | Hapus file ekspor > 7 hari                        |

```cron
* * * * * cd /var/www/ir-lab && php artisan schedule:run >> /dev/null 2>&1
```

- [ ] Cron terpasang untuk user web server

## 5. Data awal setelah login Admin

- [ ] Admin › Pengguna: buat **minimal dua Admin pribadi** (mis. kepala lab & koordinator).
      Akun dari `AdminSeeder` cukup untuk pemasangan & darurat; kerja harian lewat akun
      pribadi agar audit log jelas. Saat pergantian pengurus, Admin baru menonaktifkan yang lama.
- [ ] Admin › Semester: buat & aktifkan semester berjalan
- [ ] Admin › Ruang & Denah: periksa ruang "Lab IR" dan denah kursinya
- [ ] Admin › Pengaturan Sistem: tentukan apakah pendaftaran mandiri dibuka, domain email kampus, tarif honor
- [ ] Admin › Kelas & Jadwal: isi **Nama dosen** tiap kelas (tampil di laporan kegiatan harian Word)
- [ ] Template laporan mengawas ada di `resources/templates/laporan-mengawas.docx`
      (ikut di repo; kop & logo diubah langsung di file Word, penanda `${...}` jangan dihapus)

## 6. Uji setelah deploy

- [ ] `https://<domain>/dev/login-as/admin` → **404** (kalau terbuka, `APP_ENV` belum `production`)
- [ ] Buka halaman yang tidak ada → halaman 404 ramah, bukan halaman debug Laravel
- [ ] `curl -I https://<domain>/login` memuat `Strict-Transport-Security`, `X-Frame-Options`
- [ ] Login dengan NIM dan dengan email; 6 kali salah → diminta menunggu
- [ ] Lupa password → email benar-benar masuk
- [ ] Unggah tugas PDF/ZIP sebagai Praktikan, buka & nilai sebagai Asisten
- [ ] Generate › Single DOC langsung terunduh; ZIP/Excel berubah dari "Antre" ke "Selesai"
- [ ] Buat akun lewat Admin › Pengguna → email password sementara terkirim

## 7. Cadangan (backup)

Data penting ada di dua tempat — cadangkan keduanya setiap hari:

- [ ] Database: `mysqldump ir_lab > ir_lab-$(date +%F).sql`
- [ ] File unggahan: folder `storage/app/private/` (lampiran tugas, submission, foto laporan, poster)

Simpan cadangan di luar server dan uji pemulihannya sesekali.

## 8. Darurat: semua Admin terkunci

Aplikasi selalu menyisakan minimal satu Admin aktif (Admin aktif terakhir tidak bisa
dinonaktifkan atau diturunkan perannya). Bila tetap kehilangan akses — lupa kata sandi,
email tidak terkirim, atau pemegang akun sudah tidak ada — pulihkan dari server:

```bash
php artisan lab:recover-admin <email-akun>
```

Akun itu dijadikan Admin aktif, semua sesinya diakhiri, dan kata sandi sementara baru
ditampilkan sekali di terminal (wajib diganti saat login). Tindakan ini tercatat di audit
log (`user.admin_recovered`). Bila akunnya belum ada, buat dengan `AdminSeeder` (bagian 3).
