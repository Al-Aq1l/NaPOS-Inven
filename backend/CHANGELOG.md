# Changelog Backend

## 2026-05-20

### POS Transaction & Stock Mutation
- Memperkuat endpoint `POST /api/orders` agar transaksi POS mengurangi stok pada cabang yang dipilih secara transaksional.
- Menambahkan validasi stok cabang sebelum order dibuat; checkout ditolak jika stok cabang tidak mencukupi.
- Menggabungkan item order dengan produk sama sebelum mutasi stok agar pengurangan stok lebih konsisten.

### Stock Transfer
- Menambahkan model, migration, controller, dan route API untuk `StockTransfer` dan `StockTransferItem`.
- Mendukung alur status transfer `draft -> in-transit -> received`.
- Saat status menjadi `received`, sistem memvalidasi stok cabang asal, mengurangi stok asal, dan menambah stok cabang tujuan.
- Membersihkan route transfer agar hanya mengekspos endpoint yang sudah diimplementasikan.

### Inventory Optimization
- Menambahkan endpoint `POST /api/inventory/optimization/apply` untuk menerapkan ROP hasil rekomendasi ke database.
- Menambahkan parameter dinamis `ordering_cost` dan `holding_cost_rate` pada kalkulasi EOQ/ROP.
- Merapikan nama field response optimasi menjadi `orderingCost`, `currentOrderQty`, dan `leadTimeDays`.

### Stock Opname
- Menambahkan model, migration, controller, dan route API untuk `StockOpname` dan `StockOpnameItem`.
- Endpoint stock opname menghitung stok sistem, stok fisik, variance, nilai dampak modal, lalu memperbarui stok cabang sesuai hasil audit.

### Stock Receiving
- Menambahkan model, migration, controller, dan route API untuk `StockReceipt` dan `StockReceiptItem`.
- Menambahkan endpoint `POST /api/stock-receipts` untuk mencatat penerimaan/restock barang masuk.
- Saat penerimaan stok disimpan, sistem menambah stok pada `branch_product` cabang penerima secara transaksional.
- Menyimpan jejak audit penerimaan: supplier, nomor referensi, catatan, stok sebelum, stok sesudah, HPP/unit, subtotal, dan total nilai barang masuk.
- Mendukung opsi memperbarui HPP produk dari HPP penerimaan terbaru.

### Billing & Plan Limit
- Menambahkan endpoint simulasi `POST /api/billing/upgrade` untuk mengubah plan tenant secara langsung.
- Menambahkan validasi kuota SKU pada pembuatan produk berdasarkan plan tenant aktif.
- Menambahkan validasi kuota cabang pada pembuatan cabang berdasarkan plan tenant aktif.

### Database Integrity
- Menambahkan migration unique index untuk kombinasi `branch_id` dan `product_id` di tabel `branch_product`.

### Verifikasi
- `php artisan test` berhasil dijalankan: 2 tests passed.

## 2026-05-15

### Seeder & Data Demo
- Memperbarui `database/seeders/DatabaseSeeder.php` agar data demo lebih lengkap dan konsisten.
- Menambahkan pendekatan `updateOrCreate` untuk seed idempoten (aman dijalankan ulang).
- Menyediakan data tenant, user role utama, cabang, kategori, produk, stok per cabang.
- Menambahkan seed transaksi/order + order items multi-hari agar dashboard dan analytics terisi.
- Menyesuaikan stok akhir produk berdasarkan simulasi penjualan seed.

### Stabilitas Seed
- Memperbaiki potensi error koleksi/array saat pengolahan stok di seeder.
- Merapikan alur pembuatan data agar lebih deterministik untuk kebutuhan demo.

### Dukungan Frontend API Consumption
- Data seed disusun agar endpoint frontend yang dipakai dashboard (`branches/products/orders/categories`) memiliki isi yang cukup untuk ditampilkan.
- Menyediakan baseline data untuk pengujian RBAC role login di sisi frontend.

### Catatan
- PRD full compliance backend (middleware permission granular per endpoint, analytics aggregation endpoint granular, omnichannel adapter, billing webhook production flow) masih perlu tahap implementasi lanjutan.
