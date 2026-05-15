"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Badge, Button, Modal } from "@/components/ui";
import { RefreshCw, ExternalLink, Check, Clock, AlertCircle, ShoppingBag, Plus } from "lucide-react";
import { formatIDR } from "@/lib/constants";
import { fetchOrders, type ApiOrder } from "@/lib/dashboard-api";

export default function ChannelsPage() {
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connectModal, setConnectModal] = useState(false);

  useEffect(() => {
    fetchOrders()
      .then(setOrders)
      .catch(() => setError("Gagal memuat data kanal."))
      .finally(() => setLoading(false));
  }, []);

  const orderFeed = useMemo(() => [...orders].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 8), [orders]);

  const marketplaces = [
    { id: "1", platform: "POS Toko", connected: true, ordersToday: orderFeed.length, revenue: orderFeed.reduce((s, o) => s + Number(o.total_amount), 0) },
    { id: "2", platform: "Marketplace", connected: false, ordersToday: 0, revenue: 0 },
  ];

  const handleSync = (id: string) => { setSyncing(id); setTimeout(() => setSyncing(null), 1200); };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-[var(--text-primary)]">Omnichannel</h1><p className="text-sm text-[var(--text-secondary)] mt-1">Sinkronisasi pesanan POS dan marketplace</p></div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setConnectModal(true)}>Hubungkan Kanal</Button>
      </div>
      {error && <Card className="text-sm text-[var(--danger-500)]">{error}</Card>}
      {loading && <Card className="text-sm text-[var(--text-secondary)]">Memuat data kanal...</Card>}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {marketplaces.map((mp) => (
          <Card key={mp.id} hover>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-[var(--text-primary)]">{mp.platform}</span>
              <Badge variant={mp.connected ? "success" : "default"} dot pulse={syncing === mp.id}>{syncing === mp.id ? "Sinkron..." : mp.connected ? "Terhubung" : "Belum Terhubung"}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="p-2 bg-[var(--surface-raised)] rounded-lg text-center"><p className="text-lg font-bold">{mp.ordersToday}</p><p className="text-xs text-[var(--text-tertiary)]">Pesanan</p></div>
              <div className="p-2 bg-[var(--surface-raised)] rounded-lg text-center"><p className="text-lg font-bold">{formatIDR(mp.revenue)}</p><p className="text-xs text-[var(--text-tertiary)]">Pendapatan</p></div>
            </div>
            <div className="flex items-center justify-between"><span className="text-xs text-[var(--text-tertiary)]"><Clock className="w-3 h-3 inline mr-1" />baru saja</span><Button variant="ghost" size="sm" onClick={() => handleSync(mp.id)} loading={syncing === mp.id}><RefreshCw className="w-3.5 h-3.5" /></Button></div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2"><ShoppingBag className="w-5 h-5" /> Daftar Pesanan</h3><Badge variant="info">{orderFeed.length} terbaru</Badge></div>
          <div className="space-y-2">
            {orderFeed.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
                <div><p className="text-sm font-medium">{order.customer_name || "Pelanggan Umum"}</p><p className="text-xs text-[var(--text-tertiary)]">ORD-{order.id} - {(order.items || []).reduce((s, i) => s + i.quantity, 0)} item</p></div>
                <div className="text-right"><p className="text-sm font-semibold">{formatIDR(Number(order.total_amount))}</p><Badge size="sm" variant={order.status === "completed" ? "success" : "warning"}>{order.status === "completed" ? "confirmed" : "proses"}</Badge></div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Log Sinkronisasi</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-2.5"><Check className="w-4 h-4 text-[var(--success-500)] mt-0.5" /><div><p className="text-sm">Pesanan berhasil dimuat dari API</p><p className="text-xs text-[var(--text-tertiary)]">terbaru</p></div></div>
            <div className="flex items-start gap-2.5"><RefreshCw className="w-4 h-4 text-[var(--brand-500)] mt-0.5" /><div><p className="text-sm">Sinkronisasi manual tersedia</p></div></div>
            <div className="flex items-start gap-2.5"><AlertCircle className="w-4 h-4 text-[var(--warning-500)] mt-0.5" /><div><p className="text-sm">Integrasi marketplace eksternal belum diaktifkan</p></div></div>
          </div>
        </Card>
      </div>

      <Modal open={connectModal} onClose={() => setConnectModal(false)} title="Hubungkan Marketplace" size="sm">
        <div className="space-y-3"><p className="text-sm text-[var(--text-secondary)]">Koneksi marketplace akan memakai endpoint backend ketika integrasi aktif.</p><button className="w-full flex items-center gap-3 p-4 border border-[var(--border)] rounded-xl"><span className="text-2xl">🛍️</span><div className="flex-1 text-left"><p className="font-medium">Marketplace</p><p className="text-xs text-[var(--text-tertiary)]">Konfigurasi koneksi</p></div><ExternalLink className="w-4 h-4 text-[var(--text-tertiary)]" /></button></div>
      </Modal>
    </div>
  );
}
