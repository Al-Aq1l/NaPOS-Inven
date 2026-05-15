# NAPOS Backend (Laravel API)

Backend API untuk NAPOS (Smart Inventory & POS).

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
7. Jalankan server backend:
```bash
php artisan serve
```
Backend aktif di `http://127.0.0.1:8000`.

## Akun Demo (Seeder)
- Owner: `owner@napos.id`
- Manager: `manager@napos.id`
- Cashier: `cashier@napos.id`
- Viewer: `viewer@napos.id`
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

## Troubleshooting
- Jika seeder gagal karena data lama, jalankan ulang:
```bash
php artisan migrate:fresh --seed
```
- Jika token auth bermasalah, logout lalu login ulang dari frontend.

## Changelog
- Lihat detail perubahan backend di [CHANGELOG.md](./CHANGELOG.md)
