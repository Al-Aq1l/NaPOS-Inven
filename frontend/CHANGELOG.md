# Changelog Frontend

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
