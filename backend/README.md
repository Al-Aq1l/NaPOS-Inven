# NAPS Backend (Laravel API)

Backend API untuk NAPS (Smart Inventory & POS).

## Requirement
- PHP >= 8.2
- Composer
- MySQL/MariaDB
- Node.js (opsional, jika pakai Vite asset)

## Setup Cepat
1. Masuk ke folder backend:
```bash
cd backend
```
2. Install dependency:
```bash
composer install
```
3. Copy env:
```bash
cp .env.example .env
```
Jika di Windows PowerShell:
```powershell
Copy-Item .env.example .env
```
4. Atur database di `.env`:
- `DB_DATABASE`
- `DB_USERNAME`
- `DB_PASSWORD`

5. Generate app key:
```bash
php artisan key:generate
```
6. Jalankan migrasi + seeder demo:
```bash
php artisan migrate:fresh --seed
```
7. Aktifkan public storage untuk foto produk:
```bash
php artisan storage:link
```
Foto produk disimpan di `storage/app/public/products` dan dibaca frontend melalui URL `/storage/products/...`.

8. Jalankan server backend:
```bash
php artisan serve
```
Backend aktif di `http://127.0.0.1:8000`.

## Update Database Existing
Jika database sudah ada dan hanya ingin menambahkan dukungan foto produk, jalankan:
```bash
php artisan migrate
php artisan storage:link
```
Pastikan `APP_URL` di `.env` mengarah ke host backend yang dipakai frontend, misalnya:
```env
APP_URL=http://127.0.0.1:8000
```

## Akun Demo (Seeder)
- Owner: `owner@napos.id`
- Manager: `manager@napos.id`
- Cashier: `cashier@napos.id`
- Password semua akun: `password`

## Endpoint Dasar yang Dipakai Frontend
- `POST /api/login`
- `POST /api/logout`
- `GET /api/me`
- `GET /api/branches`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/orders`
- `GET /api/users`
- `POST /api/receipts/print`

## Printer ESC/POS
NAPS mendukung cetak struk thermal langsung lewat backend menggunakan ESC/POS. Panduan konfigurasi printer ada di [PRINTING.md](./PRINTING.md).

## Tenant, Role, dan Langganan
Logic multi-tenant, role user, limit paket, gating fitur, dan flow demo pengajuan upgrade dijelaskan di [TENANT_SUBSCRIPTION_LOGIC.md](./TENANT_SUBSCRIPTION_LOGIC.md).

## Troubleshooting
- Jika seeder gagal karena data lama, jalankan ulang:
```bash
php artisan migrate:fresh --seed
```
- Jika token auth bermasalah, logout lalu login ulang dari frontend.

## Changelog
- Lihat detail perubahan backend di [CHANGELOG.md](./CHANGELOG.md)
