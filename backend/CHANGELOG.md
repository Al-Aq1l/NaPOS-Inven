# Changelog Backend

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
