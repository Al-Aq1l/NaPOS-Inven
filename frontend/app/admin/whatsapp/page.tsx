"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Button } from "@/components/ui";
import { MessageSquare, Phone, QrCode } from "lucide-react";
import { fetchWhatsAppStatus, fetchWhatsAppQr, postWhatsAppLogout } from "@/lib/dashboard-api";

export default function AdminWhatsAppPage() {
  const [waConnected, setWaConnected] = useState(false);
  const [waPhone, setWaPhone] = useState<string | null>(null);
  const [waQr, setWaQr] = useState<string | null>(null);
  const [waLoading, setWaLoading] = useState(true);
  const [waError, setWaError] = useState<string | null>(null);
  const [waActionLoading, setWaActionLoading] = useState(false);

  // Load WhatsApp Status
  const loadWhatsAppStatus = async () => {
    try {
      const data = await fetchWhatsAppStatus();
      setWaConnected(data.connected);
      setWaPhone(data.phone);
      if (data.connected) {
        setWaQr(null);
      }
      setWaError(null);
    } catch {
      setWaError("Gagal terhubung ke microservice WhatsApp.");
    } finally {
      setWaLoading(false);
    }
  };

  // Load WhatsApp QR Code
  const loadWhatsAppQr = async () => {
    try {
      const data = await fetchWhatsAppQr();
      if (data.qr) {
        setWaQr(data.qr);
      }
    } catch (err) {
      console.error("Gagal memuat WhatsApp QR Code:", err);
    }
  };

  // Logout WhatsApp
  const handleWhatsAppLogout = async () => {
    if (!confirm("Apakah Anda yakin ingin memutuskan koneksi WhatsApp Gateway?")) return;
    setWaActionLoading(true);
    try {
      await postWhatsAppLogout();
      setWaConnected(false);
      setWaPhone(null);
      setWaQr(null);
      await loadWhatsAppQr();
    } catch {
      alert("Gagal memutuskan koneksi WhatsApp.");
    } finally {
      setWaActionLoading(false);
    }
  };

  useEffect(() => {
    loadWhatsAppStatus();
    
    // Polling status WhatsApp setiap 5 detik
    const statusInterval = setInterval(() => {
      loadWhatsAppStatus();
    }, 5000);

    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    if (waConnected) return;

    loadWhatsAppQr();
    const qrInterval = setInterval(() => {
      loadWhatsAppQr();
    }, 15000);

    return () => clearInterval(qrInterval);
  }, [waConnected]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto animate-fade-in pb-12">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Pengaturan WhatsApp Gateway</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Kelola koneksi nomor WhatsApp resmi sistem NaPS untuk pengiriman OTP dan peringatan otomatis.</p>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-6 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--brand-600)]" />
            <h2 className="font-semibold text-[var(--text-primary)] text-base">Koneksi WhatsApp Gateway</h2>
          </div>
          <Badge variant={waConnected ? "success" : "warning"}>
            {waConnected ? "Terhubung" : "Belum Terhubung"}
          </Badge>
        </div>

        {waError && (
          <div className="mb-4 rounded-lg border border-[var(--danger-200)] bg-[var(--danger-50)] p-3 text-sm text-[var(--danger-600)]">
            {waError}
          </div>
        )}

        {waLoading ? (
          <div className="text-center py-12 text-sm text-[var(--text-secondary)]">
            Memuat status integrasi...
          </div>
        ) : waConnected ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-[var(--surface-raised)] p-4 border border-[var(--border)]">
              <p className="text-sm font-medium text-[var(--text-primary)]">WhatsApp Gateway Aktif</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                WhatsApp server terhubung menggunakan nomor di bawah. Semua pengiriman kode OTP dan pengingat masa aktif langganan akan dikirim dari nomor ini secara terpusat.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-primary)] font-bold">
                <Phone className="w-4 h-4 text-[var(--brand-600)]" />
                +{waPhone}
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                className="text-[var(--danger-600)] border-[var(--danger-200)] hover:bg-[var(--danger-50)]"
                loading={waActionLoading}
                onClick={handleWhatsAppLogout}
              >
                Putuskan Koneksi Gateway
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Silakan pindai QR Code di bawah menggunakan WhatsApp resmi sistem NaPS untuk mengaktifkan pengiriman notifikasi terpusat:
              <ol className="list-decimal list-inside mt-3 space-y-1.5 text-xs text-[var(--text-secondary)]">
                <li>Buka aplikasi <b>WhatsApp</b> di HP admin sistem.</li>
                <li>Pilih <b>Pengaturan / Setelan</b> &gt; <b>Perangkat Tertaut (Linked Devices)</b>.</li>
                <li>Pilih <b>Tautkan Perangkat</b>, lalu arahkan kamera ke QR Code di bawah.</li>
              </ol>
            </div>

            <div className="flex flex-col items-center justify-center p-8 bg-[var(--surface-raised)] rounded-xl border border-[var(--border)]">
              {waQr ? (
                <div className="relative p-4 bg-white rounded-lg border shadow-sm">
                  <img src={waQr} className="w-48 h-48" alt="WhatsApp QR Code" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg pointer-events-none"></div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center w-48 h-48 bg-white border rounded-lg">
                  <QrCode className="w-10 h-10 text-[var(--text-tertiary)] animate-pulse" />
                  <span className="text-[10px] text-[var(--text-tertiary)] mt-2">Menghasilkan QR...</span>
                </div>
              )}
              <p className="text-[10px] text-[var(--text-tertiary)] mt-5 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Status QR otomatis di-refresh berkala
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
