# Changelog Frontend

## 2026-05-20

### POS Offline-First
- Menambahkan IndexedDB berbasis Dexie.js melalui `lib/db.ts`.
- Menambahkan cache produk lokal dan antrean transaksi offline untuk POS.
- Halaman `/dashboard/pos` sekarang mengambil produk dari API, menyimpan cache lokal, dan memakai cache saat koneksi gagal.
- Menambahkan deteksi online/offline real-time dan tombol sinkronisasi transaksi tertunda.
- Checkout POS sekarang POST langsung ke API saat online, atau masuk antrean IndexedDB saat offline.
- Setelah koneksi kembali online, transaksi pending otomatis disinkronkan ke backend.
- Stok POS sekarang mengikuti cabang aktif yang dipilih, bukan total stok semua cabang.
- Mengganti simulasi scan kamera POS menjadi scanner barcode/QR asli berbasis `@zxing/browser`.
- Menambahkan layout cetak struk thermal 58mm dan menghubungkan tombol **Cetak Struk** ke print dialog browser.

### Inventory Optimization
- Menambahkan tombol "Terapkan ROP" per produk dan massal di `/dashboard/inventory/optimization`.
- Menghubungkan tombol apply ke endpoint `POST /api/inventory/optimization/apply`.
- Menyesuaikan kontrak response optimasi dengan backend: `orderingCost`, `currentOrderQty`, dan `leadTimeDays`.

### Transfer Stok Cabang
- Menyelesaikan form transfer stok di `/dashboard/branches`.
- Form mendukung pilihan cabang asal, cabang tujuan, produk, dan kuantitas.
- Menambahkan daftar riwayat transfer dan aksi status `Kirim` serta `Terima`.
- Status `Terima` memicu mutasi stok melalui API backend.

### Stock Opname Digital
- Menambahkan halaman baru `/dashboard/inventory/opname`.
- Menambahkan form audit stok fisik per cabang dengan perhitungan selisih dan dampak nilai modal.
- Menambahkan simulasi pemindaian kamera berbasis WebRTC untuk menambah hitungan stok fisik secara instan.
- Menyesuaikan payload stock opname agar cocok dengan backend (`physical_stock`).
- Mengganti simulasi pemindaian stock opname menjadi scanner barcode/QR asli berbasis `@zxing/browser`.

### Barcode & QR Label
- Menambahkan label barcode dan QR Code pada halaman `/dashboard/inventory`.
- Menambahkan aksi generate barcode internal untuk produk yang belum memiliki barcode.
- Label barcode/QR menggunakan nilai `products.barcode`, sehingga bisa langsung discan oleh POS dan Stock Opname.

### Stock Receiving
- Menambahkan menu dropdown **Tambah** pada halaman `/dashboard/inventory` dengan opsi **Produk Baru** dan **Terima Stok**.
- Menghubungkan opsi **Produk Baru** ke modal create produk sungguhan, tidak lagi hanya bergantung pada data seeding.
- Form produk baru mendukung nama, SKU, barcode/QR value, kategori, HPP, harga jual, unit, ROP, cabang stok awal, dan jumlah stok awal.
- Mengubah aksi produk di tabel inventory menjadi dropdown **Aksi** berisi **Detail**, **Edit**, dan **Hapus**.
- Menambahkan modal **Detail Produk** untuk melihat informasi harga, margin, barcode/QR value, ROP, status, dan stok per cabang.
- Menambahkan modal **Edit Produk** untuk mengubah nama, SKU, barcode/QR value, kategori, HPP, harga jual, unit, ROP, dan status produk.
- Menambahkan konfirmasi **Hapus Produk** yang memanggil endpoint delete produk dan me-refresh data inventory.
- Memperbaiki dropdown aksi produk agar tidak terpotong pada baris bawah tabel.
- Memperbaiki tombol label dari detail produk agar modal barcode/QR tampil di depan.
- Menambahkan modal **Terima Stok** untuk opsi penerimaan stok dari dropdown tersebut.
- Form penerimaan stok mendukung pilihan cabang penerima, supplier, nomor referensi/invoice, catatan, dan banyak item produk.
- Setiap item menampilkan preview stok sebelum/sesudah dan subtotal nilai barang masuk.
- Menambahkan opsi memperbarui HPP produk dari HPP penerimaan.
- Setelah penerimaan disimpan, data stok inventory otomatis dimuat ulang.

### Billing Simulasi
- Menghubungkan tombol pilihan paket di halaman billing ke endpoint simulasi upgrade plan.
- Setelah upgrade berhasil, halaman memuat ulang agar akses fitur mengikuti plan terbaru.

### Dependency
- Menambahkan dependency `dexie` untuk IndexedDB offline-first.
- Menambahkan dependency `@zxing/browser`, `react-barcode`, dan `qrcode.react` untuk scanner kamera serta label barcode/QR.

### Verifikasi
- `npm run build` berhasil dijalankan.
- Catatan: `npm run lint` masih memiliki error lint repo-wide yang sudah ada/lebih luas dari scope perubahan ini.

## 2026-05-15

### Perbaikan Data & Integrasi API
- Menghapus ketergantungan mock data frontend pada halaman utama dashboard.
- Menambahkan helper API dashboard di `lib/dashboard-api.ts` untuk `branches`, `categories`, `products`, `orders`.
- Menghubungkan halaman berikut ke data backend:
  - `dashboard/page.tsx`
  - `dashboard/branches/page.tsx`
  - `dashboard/channels/page.tsx`
  - `dashboard/inventory/page.tsx`
  - `dashboard/pos/page.tsx`
  - `dashboard/analytics/page.tsx`
  - `dashboard/settings/page.tsx`
  - `dashboard/settings/billing/page.tsx`

### Perbaikan Error & Stabilitas
- Memperbaiki error build komponen inventory (nama fungsi komponen invalid).
- Memperbaiki error runtime POS terkait state cart (`setKeranjang` tidak terdefinisi).
- Menambahkan loading state, empty state, dan error state di halaman dashboard agar tidak blank.
- Memperbaiki format sumbu chart agar tidak menampilkan scientific notation saat data nol/kecil.

### UI/UX & Bahasa
- Menyeragamkan teks antarmuka ke Bahasa Indonesia pada area dashboard/billing/pricing.
- Memperbaiki visibilitas badge/status (online/proses/selesai/dll) dengan peningkatan kontras badge UI.
- Menyesuaikan copy dan navigasi agar lebih sesuai konteks UMKM dan PRD.

### RBAC & Security UX
- Menonaktifkan role switch demo di sidebar kiri bawah (role sekarang mengikuti login backend).
- Menambahkan route-level guard per halaman dashboard berdasarkan permission.
- Menambahkan halaman akses ditolak `dashboard/forbidden` (403) untuk akses URL langsung tanpa izin.

### Tier Analytics (PRD Alignment)
- Memisahkan tampilan metrik analitik per tier:
  - Starter: ringkas (tanpa grafik lanjutan)
  - Basic: operasional (jam ramai, metrik tambahan)
  - Growth/Business: metrik lanjutan (valuasi/margin sesuai akses)

### Catatan
- Beberapa fitur PRD tingkat lanjut (offline sync penuh IndexedDB conflict flow, omnichannel real API adapter, billing gateway webhook) masih tahap pengembangan lanjutan.
