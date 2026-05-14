"use client";

import { useState } from "react";
import { Card, Badge, Button, Modal, Input, StatCard } from "@/components/ui";
import { Building2, Plus, MapPin, Phone, ArrowRightLeft, Users, DollarSign, Package } from "lucide-react";
import { formatIDR } from "@/lib/constants";

const BRANCHES = [
  { id: "1", name: "Cabang Utama", address: "Jl. Sudirman No. 45, Jakarta Pusat", phone: "+6221-5551234", manager: "Ahmad Rizki", staff: 5, todayRevenue: 5_240_000, todayTx: 89, totalSKU: 1247, status: "online" },
  { id: "2", name: "Cabang Mall", address: "Grand Mall Lt. 2 Unit 205, Jakarta Selatan", phone: "+6221-5555678", manager: "Siti Nurhaliza", staff: 3, todayRevenue: 4_120_000, todayTx: 134, totalSKU: 820, status: "online" },
  { id: "3", name: "Cabang Pasar", address: "Pasar Baru Blok C-12, Jakarta Utara", phone: "+6221-5559012", manager: "Rudi Hartono", staff: 2, todayRevenue: 3_090_000, todayTx: 61, totalSKU: 580, status: "online" },
];

const TRANSFERS = [
  { id: "TRF-001", from: "Cabang Utama", to: "Cabang Mall", items: 5, status: "in_transit", date: "2024-01-15" },
  { id: "TRF-002", from: "Cabang Utama", to: "Cabang Pasar", items: 8, status: "completed", date: "2024-01-14" },
  { id: "TRF-003", from: "Cabang Mall", to: "Cabang Pasar", items: 3, status: "pending", date: "2024-01-15" },
];

export default function BranchesPage() {
  const [transferModal, setTransferModal] = useState(false);

  const totalRevenue = BRANCHES.reduce((s, b) => s + b.todayRevenue, 0);
  const totalTx = BRANCHES.reduce((s, b) => s + b.todayTx, 0);
  const totalStaff = BRANCHES.reduce((s, b) => s + b.staff, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Branches</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{BRANCHES.length} locations · All online</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<ArrowRightLeft className="w-4 h-4" />} onClick={() => setTransferModal(true)}>Stock Transfer</Button>
          <Button size="sm" icon={<Plus className="w-4 h-4" />}>Add Branch</Button>
        </div>
      </div>

      {/* Consolidated Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue Today" value={formatIDR(totalRevenue)} change="All branches combined" changeType="positive" icon={<DollarSign className="w-5 h-5" />} />
        <StatCard label="Total Transactions" value={totalTx.toString()} change="Across all locations" changeType="positive" icon={<Package className="w-5 h-5" />} />
        <StatCard label="Active Branches" value={BRANCHES.length.toString()} change="All online" changeType="positive" icon={<Building2 className="w-5 h-5" />} />
        <StatCard label="Total Staff" value={totalStaff.toString()} change={`${BRANCHES.length} managers`} changeType="neutral" icon={<Users className="w-5 h-5" />} />
      </div>

      {/* Branch Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BRANCHES.map((branch) => (
          <Card key={branch.id} hover>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{branch.name}</h3>
                <div className="flex items-center gap-1 mt-1 text-xs text-[var(--text-tertiary)]">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{branch.address}</span>
                </div>
              </div>
              <Badge variant="success" dot>{branch.status}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-2 bg-[var(--surface-raised)] rounded-lg text-center">
                <p className="text-sm font-bold text-[var(--text-primary)]">{formatIDR(branch.todayRevenue)}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Revenue</p>
              </div>
              <div className="p-2 bg-[var(--surface-raised)] rounded-lg text-center">
                <p className="text-sm font-bold text-[var(--text-primary)]">{branch.todayTx}</p>
                <p className="text-xs text-[var(--text-tertiary)]">Orders</p>
              </div>
              <div className="p-2 bg-[var(--surface-raised)] rounded-lg text-center">
                <p className="text-sm font-bold text-[var(--text-primary)]">{branch.totalSKU}</p>
                <p className="text-xs text-[var(--text-tertiary)]">SKUs</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {branch.staff} staff</div>
              <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {branch.phone}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Stock Transfers */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" /> Recent Stock Transfers
          </h3>
        </div>
        <div className="space-y-2">
          {TRANSFERS.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-raised)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{t.from} → {t.to}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{t.id} · {t.items} items · {t.date}</p>
                </div>
              </div>
              <Badge variant={t.status === "completed" ? "success" : t.status === "in_transit" ? "warning" : "default"} size="sm">
                {t.status.replace("_", " ")}
              </Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Transfer Modal */}
      <Modal open={transferModal} onClose={() => setTransferModal(false)} title="New Stock Transfer" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">From Branch</label>
              <select className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm">
                {BRANCHES.map((b) => <option key={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">To Branch</label>
              <select className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm">
                {BRANCHES.slice(1).map((b) => <option key={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
          <Input label="Search Products to Transfer" placeholder="Search by name or SKU..." />
          <p className="text-xs text-[var(--text-tertiary)]">Select products and quantities to transfer between branches.</p>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setTransferModal(false)} className="flex-1">Cancel</Button>
            <Button className="flex-1">Create Transfer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
