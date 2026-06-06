# Panduan Integrasi Midtrans di NaPOS

Dokumen ini menjelaskan bagaimana integrasi *Payment Gateway* Midtrans bekerja pada aplikasi NaPOS, baik dari sisi Backend (Laravel) maupun Frontend (Next.js).

## 1. Alur Pembayaran (Flow)

1. **User Memilih Paket Berbayar**  
   Pada saat registrasi (Tahap 4), jika pengguna memilih paket **Basic, Growth, atau Business**, sistem menganggap ini adalah transaksi berbayar.
2. **Request ke Backend**  
   Frontend mengirim data registrasi ke endpoint `POST /api/register`.
3. **Pembuatan Snap Token**  
   Backend (Laravel) menyimpan data user, kemudian memanggil API Midtrans untuk membuat transaksi baru berdasarkan harga paket yang dipilih. Midtrans mengembalikan sebuah string bernama `snap_token`. Backend meneruskan `snap_token` ini ke Frontend.
4. **Popup Midtrans (Snap UI)**  
   Frontend mendeteksi keberadaan `snap_token`. Jika ada, Frontend akan meng-inject script `snap.js` dari Midtrans dan memanggil perintah `window.snap.pay(snap_token)`. Ini akan memunculkan popup pembayaran di layar pengguna (seperti DANA, GoPay, QRIS, Transfer Bank).
5. **Webhook (Notifikasi Asynchronous)**  
   Setelah pengguna membayar (bisa langsung atau beberapa jam kemudian di ATM), server Midtrans akan mengirimkan notifikasi *Server-to-Server* ke endpoint webhook NaPOS (`POST /api/midtrans/notification`). Backend akan mengupdate status `subscriptions` pengguna dari `pending` menjadi `settlement` (Lunas).

---

## 2. Environment Variables (Konfigurasi)

Integrasi ini membutuhkan beberapa *Key* dari dashboard Midtrans Anda.

### Di Backend Laravel (`backend/.env`)

```env
# Kredensial Midtrans
MIDTRANS_SERVER_KEY=Mid-server-xxxxxxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=Mid-client-xxxxxxxxxxxxxxxxx

# TRUE = Uji Coba (Sandbox). FALSE = Uang Asli (Production).
MIDTRANS_IS_SANDBOX=true
```

### Di Frontend Next.js (`frontend/.env.local`)

```env
# Client key dibutuhkan frontend untuk menampilkan popup Snap
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=Mid-client-xxxxxxxxxxxxxxxxx

# Menentukan URL script yang akan diload (app.midtrans.com atau app.sandbox.midtrans.com)
NEXT_PUBLIC_MIDTRANS_IS_SANDBOX=true
```

> **PENTING:** Setiap kali Anda mengubah file `.env.local` di Frontend, Anda **WAJIB** merestart server dengan menekan `Ctrl+C` lalu menjalankan `npm run dev` kembali agar perubahan terbaca oleh Next.js.

---

## 3. Mode Sandbox vs Production

### Mode Sandbox (Uji Coba)
- Digunakan saat masih mendevelop aplikasi (Testing).
- **Semua metode pembayaran (GoPay, QRIS, dll) langsung tersedia.**
- Transaksi dilakukan menggunakan uang bohongan.
- Anda bisa melakukan simulasi pembayaran Lunas menggunakan **[Midtrans Simulator](https://simulator.midtrans.com)**.

### Mode Production (Live / Uang Asli)
- Digunakan saat aplikasi sudah dirilis ke publik.
- **Harus diaktifkan manual** di dashboard Midtrans (Menu *Payment Channels*).
- Proses aktivasi beberapa metode (seperti Bank Transfer, QRIS) membutuhkan verifikasi KTP, NPWP, dan rekening bank dari tim Midtrans yang bisa memakan waktu 1-5 hari kerja.
- Jika metode pembayaran belum di-approve, popup Midtrans akan muncul dengan pesan *"No payment channels available"*.

Untuk berpindah dari Sandbox ke Production:
1. Pastikan menu di kiri atas Dashboard Midtrans diset ke **Production**.
2. Copy *Server Key* dan *Client Key* yang baru (tanpa awalan `SB-`).
3. Ganti variabel `MIDTRANS_IS_SANDBOX=true` menjadi `false` di kedua folder (Backend & Frontend).
4. Restart Frontend dan Backend.

---

## 4. File Code Terkait

Jika Anda ingin mengubah logika bisnis (misal: merubah harga paket, atau menambahkan metode pembayaran spesifik), Anda bisa memodifikasi file berikut:

1. **Pembuatan Transaksi (Harga Paket dll)**
   - 📂 `backend/app/Http/Controllers/Api/AuthController.php`
   - *Cari di bagian method `register()`.*
2. **Penerimaan Notifikasi Lunas (Webhook)**
   - 📂 `backend/app/Http/Controllers/Api/PaymentWebhookController.php`
   - *Di sinilah status tabel `subscriptions` diubah menjadi `settlement`.*
3. **Database Riwayat Tagihan**
   - 📂 `backend/database/migrations/..._create_subscriptions_table.php`
   - 📂 `backend/app/Models/Subscription.php`
4. **Memunculkan Popup di Layar Pengguna**
   - 📂 `frontend/app/(auth)/register/page.tsx`
   - *Cari method `handleFinalSubmit()`.*
