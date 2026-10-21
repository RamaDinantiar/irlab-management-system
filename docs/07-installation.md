# 07 · Instalasi Lokal

[← Kembali ke README](../README.md)

## Kebutuhan

| Perangkat lunak | Versi | Catatan                                                                                                   |
| --------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| PHP             | 8.3+  | Ekstensi: `pdo_mysql`, `mbstring`, `xml`, `dom`, `fileinfo`, `zip`, `gd`, `intl`; `pdo_sqlite` untuk test |
| Composer        | 2.x   |                                                                                                           |
| Node.js         | 20+   | Beserta npm                                                                                               |
| MySQL           | 8.x   |                                                                                                           |

Di macOS, [Laravel Herd](https://herd.laravel.com) menyediakan PHP, Composer, dan Node sekaligus.

## Langkah

### 1. Database

```sql
CREATE DATABASE ir_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ir_lab'@'localhost' IDENTIFIED BY '<kata-sandi>';
GRANT ALL PRIVILEGES ON ir_lab.* TO 'ir_lab'@'localhost';
```

### 2. Dependensi & konfigurasi

```bash
composer install
npm ci
cp .env.example .env && chmod 600 .env
```

Isi minimal di `.env`:

```dotenv
APP_URL=http://127.0.0.1:8000   # atau domain Herd, mis. http://ir-lab.test
DB_DATABASE=ir_lab
DB_USERNAME=ir_lab
DB_PASSWORD=<kata-sandi>
```

### 3. Skema & data demo

```bash
php artisan key:generate
php artisan migrate
php artisan db:seed        # data & akun demo, hanya di APP_ENV=local
php artisan storage:link
```

### 4. Jalankan

```bash
composer dev
```

Perintah ini menjalankan sekaligus: server (`artisan serve`), **queue worker**, **scheduler**, log (`pail`),
dan **Vite**. Buka http://127.0.0.1:8000 lalu masuk dengan [akun demo](../README.md#akun-demo).

Tanpa Vite dev server, build aset sekali dengan `npm run build`.

## Variabel `.env` penting

| Variabel                                      | Lokal      | Keterangan                                                            |
| --------------------------------------------- | ---------- | --------------------------------------------------------------------- |
| `APP_ENV`                                     | `local`    | Seeder demo & route `/dev/login-as` hanya aktif di `local`            |
| `APP_LOCALE`                                  | `id`       | Bahasa antarmuka & tanggal                                            |
| `MAIL_MAILER`                                 | `log`      | Email (OTP, password sementara) ditulis ke `storage/logs/laravel.log` |
| `QUEUE_CONNECTION`                            | `database` | Rekap & email berjalan di antrean                                     |
| `SESSION_LIFETIME`                            | `30`       | Menit; juga batas idle                                                |
| `LAB_PROGRAMS_ENABLED`                        | `false`    | Buka modul Program                                                    |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | kosong     | Hanya untuk `AdminSeeder` di produksi                                 |

## Alat bantu pengembangan

| Perintah                        | Fungsi                                                        |
| ------------------------------- | ------------------------------------------------------------- |
| `php artisan test`              | Test suite (SQLite in-memory, database kerja tidak tersentuh) |
| `composer lint`                 | Merapikan kode PHP (Pint)                                     |
| `composer types:check`          | PHPStan level 7                                               |
| `npm run types:check`           | TypeScript                                                    |
| `npm run check` / `check:fix`   | Format & lint frontend                                        |
| `composer ci:check`             | Semua pemeriksaan, seperti CI                                 |
| `/dev/login-as/{role}?to=/path` | Masuk cepat sebagai akun demo (hanya `APP_ENV=local`)         |
| `/dev/komponen`                 | Katalog komponen UI (hanya lokal)                             |

## Troubleshooting

| Gejala                                                                     | Penyebab & solusi                                                                                                       |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `php: command not found` di terminal                                       | PATH Herd belum dimuat. Buka terminal baru, atau jalankan lewat `zsh -i -c '…'`.                                        |
| `502 Bad Gateway` di domain Herd                                           | PHP-FPM Herd berhenti. Jalankan `herd restart`.                                                                         |
| `SQLSTATE[HY000] [1045] Access denied`                                     | Kredensial `.env` tidak cocok dengan user MySQL. Periksa `DB_USERNAME`/`DB_PASSWORD` & `GRANT`.                         |
| MySQL tidak bisa start, port 3306 dipakai                                  | Dua instalasi MySQL berjalan bersamaan (mis. Homebrew & installer resmi). Matikan salah satunya.                        |
| `npm ERR! EACCES` saat `npm ci`                                            | Ada file milik root di `~/.npm`. Jalankan `sudo chown -R $(id -u):$(id -g) ~/.npm`.                                     |
| Error TypeScript `.form is not a function` / import `@/actions/...` hilang | File Wayfinder belum dibuat. Jalankan `php artisan wayfinder:generate --with-form`.                                     |
| Halaman kosong, aset 404                                                   | Vite tidak berjalan dan belum ada build. Jalankan `composer dev` atau `npm run build`. Hapus `public/hot` bila tersisa. |
| Rekap tetap "Antre"                                                        | Queue worker tidak berjalan. Gunakan `composer dev` atau `php artisan queue:work`.                                      |
| Sesi tidak mulai otomatis                                                  | Scheduler tidak berjalan. Gunakan `composer dev` atau `php artisan schedule:work`.                                      |
| Email OTP tidak masuk                                                      | Di lokal email tidak dikirim; lihat `storage/logs/laravel.log`.                                                         |

> **Jangan** `php artisan migrate:fresh` pada database kerja. Gunakan `php artisan migrate`.
