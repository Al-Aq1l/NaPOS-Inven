<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kode Verifikasi NaPS</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 520px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #1d4ed8 0%, #172554 100%); padding: 40px 32px 32px; text-align: center; }
    .header-logo { color: #fff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
    .header-logo span { color: #93c5fd; }
    .body { padding: 40px 32px; }
    .greeting { font-size: 16px; color: #334155; margin-bottom: 8px; }
    .message { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 32px; }
    .otp-box { background: #eff6ff; border: 2px dashed #93c5fd; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; }
    .otp-label { font-size: 12px; font-weight: 600; color: #3b82f6; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .otp-code { font-size: 42px; font-weight: 800; letter-spacing: 10px; color: #1d4ed8; font-variant-numeric: tabular-nums; }
    .otp-expiry { font-size: 13px; color: #94a3b8; margin-top: 10px; }
    .divider { height: 1px; background: #e2e8f0; margin: 24px 0; }
    .warning { font-size: 12px; color: #94a3b8; line-height: 1.6; }
    .warning strong { color: #64748b; }
    .footer { background: #f8fafc; padding: 20px 32px; text-align: center; }
    .footer p { font-size: 12px; color: #94a3b8; }
    .footer a { color: #3b82f6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">Na<span>PS</span></div>
    </div>
    <div class="body">
      <p class="greeting">Halo! 👋</p>
      <p class="message">
        Terima kasih telah mendaftar di <strong>NaPS</strong>. Gunakan kode OTP di bawah ini untuk memverifikasi alamat email Anda.
      </p>
      <div class="otp-box">
        <p class="otp-label">Kode Verifikasi</p>
        <p class="otp-code">{{ $otp }}</p>
        <p class="otp-expiry">⏱ Berlaku selama <strong>10 menit</strong></p>
      </div>
      <div class="divider"></div>
      <p class="warning">
        <strong>Jangan bagikan kode ini kepada siapapun.</strong><br />
        Jika Anda tidak mendaftar di NaPS, abaikan email ini. Tidak ada tindakan lebih lanjut yang diperlukan.
      </p>
    </div>
    <div class="footer">
      <p>© {{ date('Y') }} NaPS · <a href="#">Kebijakan Privasi</a></p>
    </div>
  </div>
</body>
</html>
