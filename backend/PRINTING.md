# Konfigurasi Printer ESC/POS

Backend NAPS bisa mencetak struk langsung ke printer thermal ESC/POS tanpa dialog print browser. Frontend memanggil endpoint `POST /api/receipts/print`, lalu backend mengirim command ESC/POS ke printer.

## 1. Cek Nama atau Port Printer

Di Windows PowerShell:

```powershell
Get-Printer | Select-Object Name,ShareName,Shared,DriverName,PortName
```

Contoh hasil:

```text
Name       : POS-58
ShareName  :
Shared     : False
DriverName : POS-58 11.2.0.0
PortName   : COM4:
```

Kalau `PortName` adalah `COM4:`, gunakan konfigurasi COM port. Kalau printer di-share, gunakan konfigurasi share printer.

Di macOS, cek printer CUPS:

```bash
lpstat -p
```

Contoh hasil:

```text
printer POS58 is idle. enabled since ...
```

Nama queue printer pada contoh di atas adalah `POS58`.

Untuk printer USB serial di macOS, cek device:

```bash
ls /dev/cu.*
```

Contoh device:

```text
/dev/cu.usbserial-1410
```

## 2. Konfigurasi `.env`

File: `.env`

```env
ESC_POS_ENABLED=true
ESC_POS_PRINTER_PATH=COM4:
ESC_POS_LINE_WIDTH=32
ESC_POS_FEED_LINES=4
ESC_POS_CUT=true
ESC_POS_COM_MODE=
```

Untuk printer 58mm biasanya `ESC_POS_LINE_WIDTH=32` cocok. Jika hasil terlalu lebar, coba `30`. Jika terlalu sempit, coba `34`.

## 3. Opsi A: COM Port Langsung

Gunakan saat printer muncul sebagai `COM1:`, `COM2:`, `COM3:`, dan seterusnya.

```env
ESC_POS_PRINTER_PATH=COM4:
```

Jika printer butuh setting serial tertentu, isi `ESC_POS_COM_MODE`:

```env
ESC_POS_COM_MODE=BAUD=9600 PARITY=N DATA=8 STOP=1
```

Nilai umum lain yang kadang dipakai:

```env
ESC_POS_COM_MODE=BAUD=19200 PARITY=N DATA=8 STOP=1
ESC_POS_COM_MODE=BAUD=38400 PARITY=N DATA=8 STOP=1
```

Setelah mengubah `.env`, jalankan:

```bash
php artisan config:clear
```

Lalu restart backend:

```bash
php artisan serve
```

## 4. Opsi B: Share Printer Windows

Gunakan opsi ini jika COM port gagal atau printer memakai USB printer class.

1. Buka **Control Panel**.
2. Masuk **Devices and Printers**.
3. Klik kanan printer thermal, pilih **Printer properties**.
4. Tab **Sharing**.
5. Aktifkan **Share this printer**.
6. Isi share name singkat, misalnya `POS58`.

Lalu set `.env`:

```env
ESC_POS_PRINTER_PATH=\\localhost\POS58
```

Jalankan:

```bash
php artisan config:clear
```

Restart backend.

## 5. Opsi C: macOS CUPS Printer

Gunakan opsi ini jika printer thermal muncul di **System Settings > Printers & Scanners** atau terdaftar lewat `lpstat -p`.

```env
ESC_POS_PRINTER_PATH=cups:POS58
```

Ganti `POS58` dengan nama queue dari:

```bash
lpstat -p
```

Backend akan mengirim raw ESC/POS memakai:

```bash
lpr -P POS58 -o raw
```

Setelah mengubah `.env`, jalankan:

```bash
php artisan config:clear
```

Lalu restart backend:

```bash
php artisan serve
```

## 6. Opsi D: macOS USB Serial Langsung

Gunakan opsi ini jika printer muncul sebagai device `/dev/cu.*`.

```env
ESC_POS_PRINTER_PATH=/dev/cu.usbserial-1410
```

Jika printer butuh baud rate tertentu, set lewat terminal sebelum menjalankan backend:

```bash
stty -f /dev/cu.usbserial-1410 9600 cs8 -cstopb -parenb
```

Lalu jalankan:

```bash
php artisan config:clear
php artisan serve
```

## 7. Cara Test dari Aplikasi

1. Jalankan backend:

```bash
php artisan serve
```

2. Jalankan frontend.
3. Login ke NAPS.
4. Buat transaksi di POS.
5. Klik **Cetak Struk**.

Jika berhasil, frontend menampilkan toast `Struk dikirim ke printer ESC/POS.`

## 8. Troubleshooting

### Error: `Tidak bisa membuka printer: COM4:`

Backend lama mencoba membuka COM port langsung. Versi sekarang memakai `copy /B` khusus Windows untuk COM port. Pastikan sudah restart backend setelah update.

Jika masih gagal:

- Pastikan printer benar-benar ada di `COM4:` dari hasil `Get-Printer`.
- Coba jalankan backend sebagai user Windows yang sama dengan printer terpasang.
- Coba isi `ESC_POS_COM_MODE=BAUD=9600 PARITY=N DATA=8 STOP=1`.
- Jika tetap gagal, gunakan opsi share printer Windows.

### File `COM4` muncul di `backend/public`

Ini berarti proses print menulis ke file project, bukan ke device printer. Hapus file `backend/public/COM4`, jalankan `php artisan config:clear`, lalu restart backend. Versi backend sekarang mengirim ke device path Windows `\\.\COM4` supaya file `COM4` tidak dibuat di folder `public`.

### Error: `Access is denied`

Biasanya Laravel tidak punya izin ke printer/port.

- Jalankan terminal sebagai user yang memasang printer.
- Tutup aplikasi printer utility lain yang sedang memakai COM port.
- Coba share printer dan pakai `\\localhost\POS58`.

### macOS: `lpr: Error - The printer or class does not exist`

Nama queue di `.env` tidak cocok dengan CUPS.

```bash
lpstat -p
```

Jika hasilnya `printer POS58 is idle`, gunakan:

```env
ESC_POS_PRINTER_PATH=cups:POS58
```

### macOS: `Permission denied` untuk `/dev/cu.*`

User yang menjalankan backend tidak punya akses ke device serial, atau device sedang dipakai aplikasi lain.

- Tutup aplikasi printer utility lain.
- Cabut pasang printer.
- Coba jalankan backend dari terminal user yang sama.
- Jika tetap sulit, lebih mudah gunakan opsi CUPS: `ESC_POS_PRINTER_PATH=cups:NAMA_PRINTER`.

### Struk tercetak tapi karakter aneh

Printer tidak cocok dengan code page. Ubah isi struk agar memakai karakter ASCII biasa dulu. Kode backend sudah menghapus/transliterasi karakter non-ASCII.

### Kertas tidak terpotong

Beberapa printer tidak mendukung command cut.

```env
ESC_POS_CUT=false
```

### Struk terlalu lebar atau nominal kepotong

Ubah:

```env
ESC_POS_LINE_WIDTH=30
```

Untuk printer 58mm, range yang umum adalah `30` sampai `32`.
