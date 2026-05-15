"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, Button, Input, Avatar, Badge } from "@/components/ui";
import { ROLES, type UserRole } from "@/lib/constants";
import { Building2, Upload, Users, Bell, Shield, Mail, Phone, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: "active" | "invited";
};

const NOTIF_ITEMS = [
  { label: "Peringatan stok menipis", desc: "Notifikasi saat stok di bawah ROP", checked: true },
  { label: "Pesanan channel online", desc: "Notifikasi saat ada pesanan baru", checked: true },
  { label: "Ringkasan penjualan harian", desc: "Kirim laporan penjualan ke email", checked: false },
  { label: "Error sinkronisasi", desc: "Peringatan saat sinkronisasi gagal", checked: true },
];

export default function PengaturanPage() {
  const { user, canAccess } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function loadMembers() {
      if (!user) return;
      try {
        const res = await api.get("/users");
        if (!isMounted) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        const mapped: TeamMember[] = rows.map((m: any) => ({
          id: String(m.id),
          name: m.name,
          email: m.email,
          role: (m.role as UserRole) ?? "viewer",
          status: "active",
        }));
        setMembers(mapped.length ? mapped : [{ id: user.id, name: user.name, email: user.email, role: user.role, status: "active" }]);
      } catch {
        if (!isMounted) return;
        setMembers([{ id: user.id, name: user.name, email: user.email, role: user.role, status: "active" }]);
      }
    }
    loadMembers();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const initials = useMemo(() => user?.tenant.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() ?? "TM", [user]);

  if (!user) return null;

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pengaturan</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Kelola profil usaha dan preferensi aplikasi</p>
      </div>

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="w-5 h-5 text-[var(--brand-600)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Profil Usaha</h2>
        </div>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[var(--brand-100)] rounded-xl flex items-center justify-center text-2xl font-bold text-[var(--brand-700)] dark:bg-[var(--brand-900)] dark:text-[var(--brand-300)]">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{user.tenant.name}</p>
            <Button variant="ghost" size="sm" className="mt-1"><Upload className="w-3.5 h-3.5" /> Ubah Logo</Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nama Usaha" defaultValue={user.tenant.name} leftIcon={<Building2 className="w-4 h-4" />} />
          <Input label="Email" defaultValue={user.email} leftIcon={<Mail className="w-4 h-4" />} />
          <Input label="Telepon" defaultValue={user.phone || "-"} leftIcon={<Phone className="w-4 h-4" />} />
          <Input label="Alamat" defaultValue="-" leftIcon={<MapPin className="w-4 h-4" />} />
        </div>
        <div className="mt-4 flex justify-end"><Button size="sm">Simpan Perubahan</Button></div>
      </Card>

      {canAccess("settings.users") ? (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--brand-600)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Tim</h2>
            </div>
            <Button size="sm" icon={<Users className="w-4 h-4" />}>Undang Anggota</Button>
          </div>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar name={member.name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{member.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.status === "invited" && <Badge variant="warning" size="sm">Diundang</Badge>}
                  <select defaultValue={member.role} className="h-8 px-2 bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)] cursor-pointer">
                    {(Object.keys(ROLES) as UserRole[]).map((r) => (
                      <option key={r} value={r}>{ROLES[r].label}</option>
                    ))}
                  </select>
                  {member.role !== "owner" && (
                    <button className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--danger-500)] transition-colors cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[var(--brand-600)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Tim</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">Hanya Owner yang dapat mengelola anggota tim.</p>
        </Card>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-[var(--brand-600)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Notifikasi</h2>
        </div>
        <div className="space-y-4">
          {NOTIF_ITEMS.map((item) => (
            <label key={item.label} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-raised)] transition-colors cursor-pointer">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">{item.label}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{item.desc}</p>
              </div>
              <input type="checkbox" defaultChecked={item.checked} className="w-4 h-4 accent-[var(--brand-600)] cursor-pointer" />
            </label>
          ))}
        </div>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/dashboard/settings/billing">
          <Card hover className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400"><Shield className="w-5 h-5" /></div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Tagihan & Langganan</p>
                <p className="text-xs text-[var(--text-secondary)]">Kelola paket dan metode pembayaran</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/branches">
          <Card hover className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg dark:bg-purple-900/30 dark:text-purple-400"><Building2 className="w-5 h-5" /></div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Manajemen Cabang</p>
                <p className="text-xs text-[var(--text-secondary)]">Tambah atau kelola lokasi toko</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
