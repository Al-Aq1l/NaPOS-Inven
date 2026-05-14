"use client";

import { useState } from "react";
import { Card, Badge, Button, Modal } from "@/components/ui";
import { Globe, RefreshCw, ExternalLink, Check, Clock, AlertCircle, ShoppingBag, Plus } from "lucide-react";
import { formatIDR } from "@/lib/constants";

const MARKETPLACES = [
  { id: "1", platform: "Shopee", icon: "🟠", connected: true, shopName: "TokoMakmurJaya_Official", lastSync: "2 minutes ago", status: "synced", ordersToday: 12, revenue: 2_840_000 },
  { id: "2", platform: "Tokopedia", icon: "🟢", connected: true, shopName: "Toko Makmur Jaya", lastSync: "5 minutes ago", status: "synced", ordersToday: 8, revenue: 1_950_000 },
  { id: "3", platform: "TikTok Shop", icon: "⚫", connected: false, shopName: null, lastSync: null, status: "disconnected", ordersToday: 0, revenue: 0 },
  { id: "4", platform: "Lazada", icon: "🔵", connected: false, shopName: null, lastSync: null, status: "disconnected", ordersToday: 0, revenue: 0 },
];

const ORDER_FEED = [
  { id: "MP-001", platform: "Shopee", customer: "Rina A.", items: 2, total: 168000, time: "3 min ago", status: "new" },
  { id: "MP-002", platform: "Tokopedia", customer: "Budi S.", items: 1, total: 85000, time: "8 min ago", status: "processing" },
  { id: "MP-003", platform: "Shopee", customer: "Dewi L.", items: 3, total: 245000, time: "15 min ago", status: "shipped" },
  { id: "MP-004", platform: "Tokopedia", customer: "Agus P.", items: 1, total: 32000, time: "22 min ago", status: "completed" },
  { id: "MP-005", platform: "Shopee", customer: "Maya R.", items: 4, total: 412000, time: "35 min ago", status: "completed" },
  { id: "MP-006", platform: "Shopee", customer: "Eko W.", items: 2, total: 156000, time: "1 hour ago", status: "completed" },
];

const SYNC_LOG = [
  { time: "14:32:05", type: "success", message: "Shopee: 3 new orders synced" },
  { time: "14:30:12", type: "success", message: "Tokopedia: Stock updated for 12 products" },
  { time: "14:28:00", type: "info", message: "Scheduled sync started" },
  { time: "14:15:33", type: "warning", message: "Shopee: Rate limit reached, retrying in 60s" },
  { time: "14:10:00", type: "success", message: "Tokopedia: 2 new orders synced" },
];

export default function ChannelsPage() {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [connectModal, setConnectModal] = useState(false);

  const handleSync = (id: string) => {
    setSyncing(id);
    setTimeout(() => setSyncing(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sales Channels</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Manage your omnichannel marketplace integrations</p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setConnectModal(true)}>Connect Channel</Button>
      </div>

      {/* Marketplace Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {MARKETPLACES.map((mp) => (
          <Card key={mp.id} hover>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{mp.icon}</span>
                <span className="font-semibold text-[var(--text-primary)]">{mp.platform}</span>
              </div>
              <Badge variant={mp.connected ? "success" : "default"} dot pulse={mp.connected && syncing === mp.id}>
                {syncing === mp.id ? "Syncing..." : mp.connected ? "Connected" : "Disconnected"}
              </Badge>
            </div>
            {mp.connected ? (
              <>
                <p className="text-xs text-[var(--text-tertiary)] mb-3 truncate">{mp.shopName}</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="p-2 bg-[var(--surface-raised)] rounded-lg text-center">
                    <p className="text-lg font-bold text-[var(--text-primary)]">{mp.ordersToday}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Orders</p>
                  </div>
                  <div className="p-2 bg-[var(--surface-raised)] rounded-lg text-center">
                    <p className="text-lg font-bold text-[var(--text-primary)]">{formatIDR(mp.revenue)}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Revenue</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-tertiary)]">
                    <Clock className="w-3 h-3 inline mr-1" />{mp.lastSync}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => handleSync(mp.id)} loading={syncing === mp.id}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-[var(--text-tertiary)] mb-3">Not connected yet</p>
                <Button variant="outline" size="sm" onClick={() => setConnectModal(true)}>Connect</Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Order Feed */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" /> Unified Order Feed
            </h3>
            <Badge variant="info">{ORDER_FEED.filter((o) => o.status === "new").length} new</Badge>
          </div>
          <div className="space-y-2">
            {ORDER_FEED.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">{order.platform === "Shopee" ? "🟠" : "🟢"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{order.customer}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{order.id} · {order.items} items · {order.time}</p>
                  </div>
                </div>
                <div className="text-right ml-3 flex-shrink-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{formatIDR(order.total)}</p>
                  <Badge size="sm" variant={order.status === "new" ? "brand" : order.status === "processing" ? "warning" : order.status === "shipped" ? "info" : "success"}>{order.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sync Log */}
        <Card>
          <h3 className="font-semibold text-[var(--text-primary)] mb-4">Sync Log</h3>
          <div className="space-y-3">
            {SYNC_LOG.map((log, i) => (
              <div key={i} className="flex items-start gap-2.5">
                {log.type === "success" && <Check className="w-4 h-4 text-[var(--success-500)] mt-0.5 flex-shrink-0" />}
                {log.type === "info" && <RefreshCw className="w-4 h-4 text-[var(--brand-500)] mt-0.5 flex-shrink-0" />}
                {log.type === "warning" && <AlertCircle className="w-4 h-4 text-[var(--warning-500)] mt-0.5 flex-shrink-0" />}
                <div className="min-w-0">
                  <p className="text-sm text-[var(--text-primary)]">{log.message}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Connect Modal */}
      <Modal open={connectModal} onClose={() => setConnectModal(false)} title="Connect Marketplace" size="sm">
        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">Select a marketplace to connect your store:</p>
          {MARKETPLACES.filter((m) => !m.connected).map((mp) => (
            <button key={mp.id} className="w-full flex items-center gap-3 p-4 border border-[var(--border)] rounded-xl hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)] transition-all cursor-pointer dark:hover:bg-[var(--brand-950)]">
              <span className="text-2xl">{mp.icon}</span>
              <div className="flex-1 text-left">
                <p className="font-medium text-[var(--text-primary)]">{mp.platform}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Connect your {mp.platform} seller account</p>
              </div>
              <ExternalLink className="w-4 h-4 text-[var(--text-tertiary)]" />
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
