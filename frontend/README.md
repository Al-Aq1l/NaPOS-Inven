# NAPOS Frontend (Next.js)

Frontend dashboard NAPOS berbasis Next.js App Router.

## Requirement
- Node.js 18+ (disarankan 20+)
- npm
- Backend Laravel sudah berjalan

## Setup Cepat
1. Masuk ke folder frontend:
```bash
cd frontend
```
2. Install dependency:
```bash
npm install
```
3. Buat file env lokal:
```bash
cp .env.example .env.local
```
Jika `.env.example` belum ada, buat `.env.local` manual dengan isi minimal:
```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```
4. Jalankan frontend:
```bash
npm run dev
```
Frontend aktif di `http://localhost:3000`.

## Alur Menjalankan Full App
1. Jalankan backend dulu (`php artisan serve` di folder `backend`).
2. Jalankan frontend (`npm run dev` di folder `frontend`).
3. Buka `http://localhost:3000/login` lalu login akun demo.

## Login Demo
- `owner@napos.id` / `password`
- `manager@napos.id` / `password`
- `cashier@napos.id` / `password`
- `viewer@napos.id` / `password`

## Catatan RBAC
- Role mengikuti hasil login backend.
- Role switch demo di sidebar sudah dinonaktifkan.
- Route-level guard aktif, user tanpa akses akan diarahkan ke halaman 403 dashboard.

## Scripts
- Dev server:
```bash
npm run dev
```
- Lint:
```bash
npm run lint
```
- Build production:
```bash
npm run build
```

## Changelog
- Lihat detail perubahan frontend di [CHANGELOG.md](./CHANGELOG.md)
