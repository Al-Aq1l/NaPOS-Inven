<?php

namespace App\Services;

use RuntimeException;

class EscPosReceiptPrinter
{
    public function print(array $receipt): void
    {
        if (!config('printing.enabled')) {
            throw new RuntimeException('ESC/POS printing is disabled.');
        }

        $printerPath = trim((string) config('printing.printer_path'));
        if ($printerPath === '') {
            throw new RuntimeException('ESC_POS_PRINTER_PATH belum diatur di .env.');
        }

        $bytes = $this->buildReceipt($receipt);
        $this->send($printerPath, $bytes);
    }

    private function send(string $printerPath, string $bytes): void
    {
        if ($this->isComPort($printerPath) && strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            $this->sendToWindowsComPort($printerPath, $bytes);
            return;
        }

        if ($this->isCupsQueue($printerPath)) {
            $this->sendToCupsQueue($printerPath, $bytes);
            return;
        }

        $handle = @fopen($printerPath, 'wb');

        if ($handle === false) {
            throw new RuntimeException("Tidak bisa membuka printer: {$printerPath}");
        }

        try {
            $written = fwrite($handle, $bytes);
            if ($written === false || $written < strlen($bytes)) {
                throw new RuntimeException('Gagal menulis data ESC/POS ke printer.');
            }

            fflush($handle);

            if (str_starts_with($printerPath, '/dev/cu.')) {
                usleep(300000);
            }
        } finally {
            fclose($handle);
        }
    }

    private function sendToWindowsComPort(string $printerPath, string $bytes): void
    {
        $port = strtoupper(rtrim($printerPath, ':')) . ':';
        if (!preg_match('/^COM\d+:$/', $port)) {
            throw new RuntimeException("Port COM tidak valid: {$printerPath}");
        }

        $directory = storage_path('app/escpos');
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new RuntimeException("Tidak bisa membuat folder spool ESC/POS: {$directory}");
        }

        $file = $directory . DIRECTORY_SEPARATOR . 'receipt-' . uniqid('', true) . '.bin';
        if (file_put_contents($file, $bytes) === false) {
            throw new RuntimeException('Tidak bisa membuat file raw ESC/POS sementara.');
        }

        try {
            $mode = trim((string) config('printing.com_mode'));
            if ($mode !== '') {
                if (!preg_match('/^[A-Za-z0-9=, ]+$/', $mode)) {
                    throw new RuntimeException('ESC_POS_COM_MODE berisi karakter yang tidak valid.');
                }

                $this->runWindowsCommand('mode ' . $port . ' ' . $mode);
            }

            $devicePath = '\\\\.\\' . rtrim($port, ':');
            $this->runWindowsCommand('copy /B ' . escapeshellarg($file) . ' ' . escapeshellarg($devicePath));
        } finally {
            @unlink($file);
        }
    }

    private function runWindowsCommand(string $command): void
    {
        $output = [];
        $exitCode = 0;

        exec('cmd /C ' . $command . ' 2>&1', $output, $exitCode);

        if ($exitCode !== 0) {
            $message = trim(implode("\n", $output));
            throw new RuntimeException($message !== '' ? $message : 'Command Windows gagal: ' . $command);
        }
    }

    private function sendToCupsQueue(string $printerPath, string $bytes): void
    {
        $queue = trim(substr($printerPath, strlen('cups:')));
        if (!preg_match('/^[A-Za-z0-9_.-]+$/', $queue)) {
            throw new RuntimeException("Nama printer CUPS tidak valid: {$queue}");
        }

        $directory = storage_path('app/escpos');
        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new RuntimeException("Tidak bisa membuat folder spool ESC/POS: {$directory}");
        }

        $file = $directory . DIRECTORY_SEPARATOR . 'receipt-' . uniqid('', true) . '.bin';
        if (file_put_contents($file, $bytes) === false) {
            throw new RuntimeException('Tidak bisa membuat file raw ESC/POS sementara.');
        }

        try {
            $this->runShellCommand('lpr -P ' . escapeshellarg($queue) . ' -o raw ' . escapeshellarg($file));
        } finally {
            @unlink($file);
        }
    }

    private function runShellCommand(string $command): void
    {
        $output = [];
        $exitCode = 0;

        exec($command . ' 2>&1', $output, $exitCode);

        if ($exitCode !== 0) {
            $message = trim(implode("\n", $output));
            throw new RuntimeException($message !== '' ? $message : 'Command shell gagal: ' . $command);
        }
    }

    private function isComPort(string $printerPath): bool
    {
        return preg_match('/^COM\d+:?$/i', trim($printerPath)) === 1;
    }

    private function isCupsQueue(string $printerPath): bool
    {
        return str_starts_with(strtolower(trim($printerPath)), 'cups:');
    }

    private function buildReceipt(array $receipt): string
    {
        $width = max(24, min(48, (int) config('printing.line_width', 32)));
        $feedLines = max(1, min(8, (int) config('printing.feed_lines', 4)));

        $out = '';
        $out .= "\x1B\x40"; // Initialize printer.
        $out .= "\x1B\x74\x13"; // PC858 code page where supported.
        $out .= "\x1B\x61\x01"; // Center.
        $out .= "\x1B\x45\x01" . $this->line('NAPS', $width) . "\x1B\x45\x00";
        $out .= $this->line('Smart Inventory & POS', $width);
        $out .= $this->line('Cabang: ' . ($receipt['branch_name'] ?? '-'), $width);
        $out .= "\x1B\x61\x00"; // Left.
        $out .= $this->separator($width);

        $out .= $this->columns('No', $receipt['receipt_id'] ?? '-', $width);
        $out .= $this->columns('Waktu', $receipt['receipt_time'] ?? '-', $width);
        $out .= $this->columns('Kasir', $receipt['cashier_name'] ?? '-', $width);
        $out .= $this->columns('Pelanggan', $receipt['customer_name'] ?? 'Pelanggan Umum', $width);
        $out .= $this->columns('Bayar', $receipt['payment_method_label'] ?? '-', $width);
        if (($receipt['payment_method_label'] ?? '') === 'Tunai') {
            $out .= $this->columns('Diterima', $this->rupiah((int) ($receipt['cash_paid'] ?? 0)), $width);
            $out .= $this->columns('Kembali', $this->rupiah((int) ($receipt['change'] ?? 0)), $width);
        }
        $out .= $this->separator($width);

        foreach (($receipt['items'] ?? []) as $item) {
            $name = $this->sanitize((string) ($item['name'] ?? '-'));
            foreach ($this->wrap($name, $width) as $line) {
                $out .= $line . "\n";
            }

            $qty = (int) ($item['quantity'] ?? 0);
            $price = (int) ($item['price'] ?? 0);
            $subtotal = (int) ($item['subtotal'] ?? ($qty * $price));
            $out .= $this->columns("{$qty} x " . $this->rupiah($price), $this->rupiah($subtotal), $width);
        }

        $out .= $this->separator($width);
        $out .= $this->columns('Subtotal', $this->rupiah((int) ($receipt['subtotal'] ?? 0)), $width);
        $out .= $this->columns('PPN 11%', $this->rupiah((int) ($receipt['tax'] ?? 0)), $width);
        $out .= "\x1B\x45\x01";
        $out .= $this->columns('Total', $this->rupiah((int) ($receipt['total'] ?? 0)), $width);
        $out .= "\x1B\x45\x00";
        $out .= $this->separator($width);

        $out .= "\x1B\x61\x01";
        $out .= $this->line('Terima kasih', $width);
        $out .= $this->line(($receipt['is_offline'] ?? false) ? 'Transaksi tersimpan lokal' : 'Transaksi tersimpan', $width);
        $out .= str_repeat("\n", $feedLines);

        if (config('printing.cut')) {
            $out .= "\x1D\x56\x42\x00"; // Partial cut.
        }

        return $out;
    }

    private function columns(string $left, string $right, int $width): string
    {
        $left = $this->sanitize($left);
        $right = $this->sanitize($right);
        $rightWidth = min(14, max(8, strlen($right)));
        $leftWidth = $width - $rightWidth - 1;

        $lines = $this->wrap($left, $leftWidth);
        $out = '';

        foreach ($lines as $index => $line) {
            if ($index === 0) {
                $out .= str_pad($line, $leftWidth) . ' ' . str_pad($right, $rightWidth, ' ', STR_PAD_LEFT) . "\n";
                continue;
            }

            $out .= $line . "\n";
        }

        return $out;
    }

    private function line(string $text, int $width): string
    {
        $text = $this->sanitize($text);
        return str_pad($text, $width, ' ', STR_PAD_BOTH) . "\n";
    }

    private function separator(int $width): string
    {
        return str_repeat('-', $width) . "\n";
    }

    private function wrap(string $text, int $width): array
    {
        $text = $this->sanitize($text);
        $wrapped = wordwrap($text, $width, "\n", true);
        return explode("\n", $wrapped === '' ? '-' : $wrapped);
    }

    private function rupiah(int $value): string
    {
        return 'Rp ' . number_format($value, 0, ',', '.');
    }

    private function sanitize(string $text): string
    {
        $text = str_replace(["\r", "\n", "\t"], ' ', $text);
        $text = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text) ?: $text;
        return trim(preg_replace('/\s+/', ' ', $text) ?? $text);
    }
}
