# NAPS Super Admin & Tenant Management System Documentation

Dokumentasi sistem Super Admin untuk memantau, mengelola langganan, dan mengontrol status aktif akun tenant NAPS (Smart Inventory & POS).

---

## 🔑 Default Administrator Credentials

Akun administrator default telah ditambahkan ke database melalui seeder migrasi:
* **Email:** `admin@napos.id`
* **Password:** `passwordadmin`
* **Role:** `superadmin`

*Catatan: Akun ini tidak terikat pada tenant mana pun (`tenant_id` bernilai `NULL`), memungkinkan hak akses sistem penuh secara global.*

---

## 🛠️ Ringkasan Komponen Sistem

Sistem ini terintegrasi penuh di backend (Laravel API) dan frontend (Next.js):

### 1. Database & Migrasi (Backend)
* **File Migrasi:** `database/migrations/2026_06_24_010000_enable_superadmin_role.php`
  * Mengubah kolom `tenant_id` pada tabel `users` menjadi *nullable* untuk memfasilitasi akun sistem global.
  * Memperluas tipe enum `role` pada tabel `users` menjadi: `['owner', 'manager', 'cashier', 'superadmin']`.
  * Memasukkan akun seeder default `admin@napos.id`.
* **Model User (`app/Models/User.php`):**
  * Menambahkan helper `isSuperAdmin()` untuk mempermudah pengecekan hak akses.
  * Mengamankan relasi `tenant()` agar tidak crash ketika bernilai null (misal saat login sebagai superadmin).

### 2. Backend API & Routing
* **Controller:** `app/Http/Controllers/Api/AdminController.php`
  * `summary()`: Menghitung statistik sistem (Pendapatan total dari Midtrans, Jumlah Tenant, Tenant Berbayar, Akun Ditangguhkan, dan daftar peringatan kedaluwarsa ≤ 7 hari).
  * `tenants()`: Mengambil list tenant terdaftar dengan paginasi, pencarian keyword, dan filter paket/status.
  * `updateSubscription()`: Meng-override paket, siklus tagihan, dan tanggal kedaluwarsa secara manual.
  * `toggleActive()`: Menangguhkan (suspend) atau mengaktifkan kembali akun tenant.
* **Routing (`routes/api.php`):**
  * Rute admin diproteksi oleh middleware `auth:sanctum` dan `role:superadmin` di bawah prefix `/api/admin/*`.
* **Moking Auth (`AuthController.php`):**
  * Menghindari error tipe frontend dengan menyuntikkan tenant virtual ("System Admin") pada respons profil superadmin.

### 3. Frontend Portal (`/admin/*`)
* **Portal Layout (`app/admin/layout.tsx`):**
  * Desain template dashboard modern dengan Sidebar gelap (`bg-[#0a1321]`) dan area kerja abu-abu netral.
  * Dilengkapi widget **"Sistem Manajemen"** yang dihighlight dengan aksen garis biru (`border-l-2 border-blue-500`) dan background flat slate.
  * **Branding:** Menampilkan teks minimalis "Naps Admin" tanpa logo visual.
  * Proteksi Rute: Otomatis me-redirect pengguna non-superadmin kembali ke dashboard toko mereka.
* **Dashboard Ringkasan (`app/admin/dashboard/page.tsx`):**
  * Menampilkan metrik performa utama.
  * Alert peringatan kedaluwarsa langganan dengan tombol aksi cepat kirim pesan WhatsApp pengingat otomatis ke kontak tenant.
* **Database Tenant (`app/admin/tenants/page.tsx`):**
  * Tabel data interaktif terintegrasi dengan modul pencarian keyword dan filter paket/status terpadu.
  * Panel laci slide-out (Drawer) untuk memperpanjang durasi lisensi secara instan (`+30 Hari`, `+90 Hari`, `+1 Tahun`), mengganti paket layanan (Starter, Basic, Growth, Business), serta tombol tangguhkan (suspend) / aktifkan akun.

---

## ⚙️ Konfigurasi API Proxy (Next.js)

Untuk menangani rute request API client-side secara aman dan menghindari masalah CORS pada environment local, konfigurasi Next.js (`next.config.ts`) telah ditambahkan rewrite rule:

```typescript
// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
```

Request client-side menuju `/api/*` pada port `3000` (Next.js) otomatis diteruskan ke port `8000` (Laravel).

---

## 🚀 Panduan Menjalankan Sistem

1. **Jalankan Migrasi Database:**
   Di terminal direktori `backend/`, jalankan perintah berikut untuk meng-update skema tabel dan membuat user superadmin default:
   ```bash
   php artisan migrate
   ```

2. **Jalankan Server Backend:**
   ```bash
   php artisan serve --port=8000
   ```

3. **Mulai Server Frontend (Next.js):**
   Pastikan Anda merestart Next.js dev server setelah `next.config.ts` di-update agar rewrite rule-nya dimuat ulang:
   ```bash
   npm run dev
   ```

4. **Login & Masuk Portal:**
   * Akses halaman login di: `http://localhost:3000/login`
   * Masukkan email `admin@napos.id` dan password `passwordadmin`.
   * Sistem akan mendeteksi role `superadmin` dan otomatis mengarahkan Anda langsung ke portal `/admin/dashboard`.
