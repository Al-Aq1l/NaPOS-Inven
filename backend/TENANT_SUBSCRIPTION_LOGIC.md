# Tenant, Role, and Subscription Logic

Dokumen ini menjelaskan logic akses NAPS untuk multi-tenant, role user, batas paket langganan, dan flow demo pengajuan upgrade paket.

## Prinsip Utama

NAPS tidak memakai database terpisah untuk Owner, Manager, dan Cashier. Semua pengguna disimpan di tabel `users` dengan kolom `tenant_id` dan `role`.

Alur akses:

```text
Email + password = autentikasi user
tenant_id = isolasi data usaha
role = izin pengguna
plan = batas fitur dan kuota langganan
```

Password hanya membuktikan user berhasil login. Setelah login, akses data dan fitur ditentukan oleh `tenant_id`, `role`, dan paket aktif tenant.

## Tenant

Tenant adalah entitas usaha/toko. Data tenant berada di tabel `tenants`.

Kolom penting:

```text
id
name
slug
plan
trial_ends_at
is_active
```

Paket aktif tenant disimpan di `tenants.plan`. Nilai yang didukung:

```text
starter
basic
growth
business
```

Data operasional seperti cabang, produk, kategori, order, penerimaan stok, dan opname harus selalu terikat ke tenant melalui model scoped atau relasi tenant.

## User dan Role

Semua user berada di tabel `users`.

Kolom penting:

```text
id
tenant_id
name
email
password
role
```

Role yang dipakai:

```text
owner
manager
cashier
```

Makna role:

- `owner`: akses bisnis penuh, termasuk settings, billing, dan pengelolaan user.
- `manager`: akses operasional seperti inventori, cabang, stok, dan laporan sesuai paket.
- `cashier`: fokus POS/kasir.

Role tidak boleh diganti bebas dari frontend. Role harus mengikuti data backend dan, saat fitur update role dibuat, wajib divalidasi di backend.

## Paket dan Limit

Limit paket didefinisikan terpusat di:

```text
app/Services/PlanLimits.php
```

Daftar limit demo saat ini:

| Paket | SKU | Cabang | User | Fitur Utama |
| --- | ---: | ---: | ---: | --- |
| starter | 30 | 1 | 1 | POS, inventori dasar |
| basic | 500 | 1 | 2 | POS, inventori dasar, analitik dasar |
| growth | unlimited | 2 | 5 | transfer stok, opname, optimasi, analitik |
| business | unlimited | 5 | 99 | fitur growth + omnichannel/API |

Catatan:

- `null` pada `max_sku` berarti unlimited.
- Limit backend adalah sumber kebenaran.
- Frontend boleh menampilkan progress/disable UI, tetapi backend tetap wajib menolak request yang melewati limit.

## Validasi Limit Backend

### Cabang

Pembuatan cabang dicek di:

```text
app/Http/Controllers/BranchController.php
```

Jika jumlah cabang tenant sudah mencapai `max_branches`, backend menolak dengan HTTP `403`.

### Produk/SKU

Pembuatan produk dicek di:

```text
app/Http/Controllers/ProductController.php
```

Jika paket punya batas SKU dan jumlah produk tenant sudah mencapai limit, backend menolak dengan HTTP `403`.

### User

Endpoint user demo berada di:

```text
app/Http/Controllers/UserController.php
```

Saat fitur invite user dibuat, jumlah user tenant harus dibandingkan dengan `max_users`.

## Gating Fitur Paket

Fitur premium dikunci oleh middleware:

```text
app/Http/Middleware/EnsurePlanFeature.php
```

Alias middleware:

```text
plan.feature
```

Contoh route:

```php
Route::middleware('plan.feature:stock_transfer')->group(function () {
    Route::apiResource('transfers', StockTransferController::class);
});
```

Fitur yang saat ini dikunci:

```text
stock_transfer
opname
optimization
```

Jika tenant belum punya fitur tersebut di paket aktif, backend menolak dengan HTTP `403`.

## Frontend Access Logic

Frontend juga melakukan gating untuk UX di:

```text
frontend/lib/auth-context.tsx
```

Frontend mengecek:

```text
role user
plan tenant
feature route
```

Contoh:

- Manager pada paket `starter` boleh melihat inventori dasar.
- Manager pada paket `starter` tidak melihat menu transfer/opname/optimasi.
- Owner tetap bisa membuka Billing karena billing adalah area settings, tetapi paket aktif tidak berubah dari frontend secara langsung.

Frontend gating hanya untuk pengalaman pengguna. Backend tetap menjadi penjaga utama.

## Billing dan Pengajuan Upgrade

Endpoint billing:

```text
GET /api/billing
POST /api/billing/upgrade
```

`GET /api/billing` mengembalikan:

```text
plan aktif
status tenant
limit paket
usage SKU/cabang/user
```

`POST /api/billing/upgrade` saat ini hanya membuat respons request demo:

```text
status: pending
requested_plan
current_plan
message
```

Endpoint ini sengaja tidak mengubah `tenants.plan`. Paket aktif hanya boleh berubah melalui proses yang lebih aman, seperti:

- approval admin internal
- payment gateway
- billing webhook

## Flow Demo Upgrade Paket

Flow demo yang disarankan:

```text
Owner klik Ajukan paket
Backend simpan request upgrade
Backend kirim email ke admin/internal
Owner melihat toast bahwa request terkirim
Tenant plan tetap belum berubah
Admin/payment menyetujui request
Baru tenant.plan berubah
```

Untuk demo email, opsi yang disarankan:

- Mailtrap untuk development/demo aman.
- Gmail SMTP jika ingin benar-benar masuk inbox.
- Laravel log mail untuk mode paling sederhana.

Isi email demo:

```text
Subject: Permintaan Upgrade Paket - {tenant_name}

Tenant: {tenant_name}
Paket saat ini: {current_plan}
Paket diminta: {requested_plan}
Diminta oleh: {user_name}
Email: {user_email}
Status: Pending
```

## Next Step yang Direkomendasikan

Tahap berikutnya agar flow upgrade lebih lengkap:

1. Buat tabel `subscription_change_requests`.
2. Simpan request upgrade ke database.
3. Kirim email admin saat request dibuat.
4. Buat halaman admin/internal untuk melihat request.
5. Tambahkan action approve/reject.
6. Ubah `tenants.plan` hanya saat request approved atau payment webhook sukses.

Dengan cara ini, user tidak bisa mengganti paket seenaknya dari pengaturan, tetapi demo tetap terlihat realistis karena ada alur pengajuan.
