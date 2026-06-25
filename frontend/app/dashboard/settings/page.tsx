"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Card, Button, Input, Avatar, Badge, Modal } from "@/components/ui";
import { ROLES, type UserRole } from "@/lib/constants";
import { Building2, Upload, Users, Bell, Shield, Mail, Phone, MapPin, Trash2, Eye, Pencil, ChevronDown, MessageSquare, QrCode, Percent } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { fetchBranches, type ApiBranch, fetchWhatsAppStatus, fetchWhatsAppQr, postWhatsAppLogout } from "@/lib/dashboard-api";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: number | null;
  branchName: string | null;
  status: "active" | "invited";
};

type ApiTeamMember = {
  id: number | string;
  name: string;
  email: string;
  role?: UserRole;
  branch_id?: number | null;
  branch?: ApiBranch | null;
};

const NOTIF_ITEMS = [
  { label: "Peringatan stok menipis", desc: "Notifikasi saat stok di bawah ROP", checked: true },
  { label: "Pesanan channel online", desc: "Notifikasi saat ada pesanan baru", checked: true },
  { label: "Ringkasan penjualan harian", desc: "Kirim laporan penjualan ke email", checked: false },
  { label: "Error sinkronisasi", desc: "Peringatan saat sinkronisasi gagal", checked: true },
];

export default function PengaturanPage() {
  const { user, canAccess, refreshUser } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);

  // Profile Settings States
  const [businessName, setBusinessName] = useState("");
  const [taxRate, setTaxRate] = useState("11");
  const [businessPhone, setBusinessPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Logo States & Handlers
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  useEffect(() => {
    if (user?.tenant?.id) {
      const stored = localStorage.getItem(`naps_logo_${user.tenant.id}`);
      setLogoBase64(stored);
    }
  }, [user]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user?.tenant?.id) {
      setProfileError("Sesi usaha tidak ditemukan.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setProfileError("Ukuran logo maksimal 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      localStorage.setItem(`naps_logo_${user.tenant.id}`, base64);
      setLogoBase64(base64);
      window.dispatchEvent(new Event("naps_logo_updated"));
      setProfileSuccess("Logo usaha berhasil diperbarui.");
      setTimeout(() => setProfileSuccess(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    if (user?.tenant?.id && confirm("Apakah Anda yakin ingin menghapus logo usaha?")) {
      localStorage.removeItem(`naps_logo_${user.tenant.id}`);
      setLogoBase64(null);
      window.dispatchEvent(new Event("naps_logo_updated"));
      setProfileSuccess("Logo usaha berhasil dihapus.");
      setTimeout(() => setProfileSuccess(null), 3000);
    }
  };

  useEffect(() => {
    if (user?.tenant) {
      setBusinessName(user.tenant.name);
      setTaxRate(user.tenant.tax_rate !== undefined ? String(user.tenant.tax_rate) : "11");
      setBusinessPhone(user.tenant.phone || "");
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!businessName.trim()) {
      setProfileError("Nama usaha tidak boleh kosong.");
      return;
    }
    const taxNum = parseInt(taxRate, 10);
    if (isNaN(taxNum) || taxNum < 0 || taxNum > 100) {
      setProfileError("Tarif PPN harus berupa angka antara 0% dan 100%.");
      return;
    }

    setProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      await api.put("/settings", {
        name: businessName,
        tax_rate: taxNum,
        phone: businessPhone.trim() || null,
      });
      await refreshUser();
      setProfileSuccess("Profil usaha berhasil diperbarui.");
      setTimeout(() => setProfileSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setProfileError(err.response?.data?.message || "Gagal menyimpan perubahan.");
    } finally {
      setProfileSaving(false);
    }
  };

  // WhatsApp States
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
    } catch (err) {
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
    if (!confirm("Apakah Anda yakin ingin memutuskan koneksi WhatsApp?")) return;
    setWaActionLoading(true);
    try {
      await postWhatsAppLogout();
      setWaConnected(false);
      setWaPhone(null);
      setWaQr(null);
      await loadWhatsAppQr();
    } catch (err) {
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
    // Jika tidak terhubung, muat QR code dan poll QR code setiap 15 detik
    if (waConnected) return;

    loadWhatsAppQr();
    const qrInterval = setInterval(() => {
      loadWhatsAppQr();
    }, 15000);

    return () => clearInterval(qrInterval);
  }, [waConnected]);
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteSaving, setInviteSaving] = useState(false);
  const [detailMember, setDetailMember] = useState<TeamMember | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [openActionMemberId, setOpenActionMemberId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    role: "cashier" as UserRole,
    branchId: "",
  });
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "cashier" as UserRole,
    branchId: "",
  });

  useEffect(() => {
    let isMounted = true;
    async function loadMembers() {
      if (!user) return;
      try {
        const res = await api.get("/users");
        if (!isMounted) return;
        const rows = Array.isArray(res.data) ? res.data : [];
        const mapped: TeamMember[] = rows.map((m: ApiTeamMember) => ({
          id: String(m.id),
          name: m.name,
          email: m.email,
          role: (m.role as UserRole) ?? "cashier",
          branchId: m.branch_id ?? null,
          branchName: m.branch?.name ?? null,
          status: "active",
        }));
        setMembers(mapped.length ? mapped : [{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branch_id,
          branchName: user.branch?.name ?? null,
          status: "active",
        }]);
      } catch {
        if (!isMounted) return;
        setMembers([{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branch_id,
          branchName: user.branch?.name ?? null,
          status: "active",
        }]);
      }
    }
    loadMembers();
    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!canAccess("settings.users")) return;

    let isMounted = true;
    fetchBranches()
      .then((rows) => {
        if (isMounted) setBranches(rows);
      })
      .catch(() => {
        if (isMounted) setBranches([]);
      });

    return () => {
      isMounted = false;
    };
  }, [canAccess]);

  const initials = useMemo(() => user?.tenant.name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase() ?? "TM", [user]);

  const updateTeamMember = async (member: TeamMember, patch: { role?: UserRole; branchId?: number | null }) => {
    const nextRole = patch.role ?? member.role;
    const nextBranchId = nextRole === "cashier" ? patch.branchId ?? member.branchId ?? branches[0]?.id ?? null : null;

    setTeamError(null);
    setSavingMemberId(member.id);

    try {
      const res = await api.put(`/users/${member.id}`, {
        role: nextRole,
        branch_id: nextBranchId,
      });
      const updated = res.data as ApiTeamMember;
      setMembers((current) => current.map((item) => item.id === member.id ? {
        ...item,
        role: (updated.role as UserRole) ?? nextRole,
        branchId: updated.branch_id ?? null,
        branchName: updated.branch?.name ?? null,
      } : item));
    } catch (error: unknown) {
      const message = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setTeamError(message ?? "Gagal menyimpan pengaturan anggota tim.");
    } finally {
      setSavingMemberId(null);
    }
  };

  const openInviteModal = () => {
    setTeamError(null);
    setInviteForm({
      name: "",
      email: "",
      password: "",
      role: "cashier",
      branchId: branches[0] ? String(branches[0].id) : "",
    });
    setInviteOpen(true);
  };

  const openEditMember = (member: TeamMember) => {
    setTeamError(null);
    setEditingMember(member);
    setEditForm({
      role: member.role,
      branchId: member.branchId ? String(member.branchId) : String(branches[0]?.id ?? ""),
    });
  };

  const submitEditMember = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingMember) return;

    await updateTeamMember(editingMember, {
      role: editForm.role,
      branchId: editForm.role === "cashier" ? Number(editForm.branchId) : null,
    });
    setEditingMember(null);
  };

  const submitInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTeamError(null);
    setInviteSaving(true);

    try {
      const res = await api.post("/users", {
        name: inviteForm.name,
        email: inviteForm.email,
        password: inviteForm.password,
        role: inviteForm.role,
        branch_id: inviteForm.role === "cashier" ? Number(inviteForm.branchId) : null,
      });
      const created = res.data as ApiTeamMember;
      setMembers((current) => [...current, {
        id: String(created.id),
        name: created.name,
        email: created.email,
        role: (created.role as UserRole) ?? inviteForm.role,
        branchId: created.branch_id ?? null,
        branchName: created.branch?.name ?? null,
        status: "active" as const,
      }].sort((a, b) => a.name.localeCompare(b.name)));
      setInviteOpen(false);
    } catch (error: unknown) {
      const message = typeof error === "object" && error !== null && "response" in error
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setTeamError(message ?? "Gagal menambahkan anggota tim.");
    } finally {
      setInviteSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pengaturan</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Kelola profil usaha dan preferensi aplikasi</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column — Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="w-5 h-5 text-[var(--brand-600)]" />
              <h2 className="font-semibold text-[var(--text-primary)]">Profil Usaha</h2>
            </div>
            
            <div className="flex items-center gap-4 mb-6">
              {logoBase64 ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-[var(--border)] group shrink-0">
                  <img src={logoBase64} alt="Business Logo" className="w-full h-full object-cover" />
                  <button 
                    type="button"
                    onClick={handleRemoveLogo}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity duration-150 cursor-pointer font-semibold"
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 bg-[var(--brand-100)] rounded-xl flex items-center justify-center text-2xl font-bold text-[var(--brand-700)] dark:bg-[var(--brand-900)] dark:text-[var(--brand-300)] shrink-0">
                  {initials}
                </div>
              )}
              <div>
                <p className="font-semibold text-[var(--text-primary)]">{user.tenant.name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <label className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-[var(--text-secondary)] border border-[var(--border)] hover:bg-[var(--slate-50)] dark:hover:bg-[var(--slate-800)] rounded-lg transition-colors cursor-pointer select-none">
                    <Upload className="w-3.5 h-3.5" /> 
                    Ubah Logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  </label>
                  {logoBase64 && (
                    <Button variant="ghost" size="sm" className="text-[var(--danger-600)] hover:bg-[var(--danger-50)] h-8" onClick={handleRemoveLogo}>
                      Hapus
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {profileSuccess && (
              <div className="mb-4 rounded-lg border border-[var(--success-200)] bg-[var(--success-50)] p-3 text-sm text-[var(--success-600)] animate-fade-in">
                {profileSuccess}
              </div>
            )}
            {profileError && (
              <div className="mb-4 rounded-lg border border-[var(--danger-200)] bg-[var(--danger-50)] p-3 text-sm text-[var(--danger-600)] animate-fade-in">
                {profileError}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Nama Usaha"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                leftIcon={<Building2 className="w-4 h-4" />}
              />
              <Input
                label="Tarif PPN (%)"
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                leftIcon={<Percent className="w-4 h-4" />}
                placeholder="Contoh: 11"
                min={0}
                max={100}
              />
              <Input label="Email Akun" disabled defaultValue={user.email} leftIcon={<Mail className="w-4 h-4" />} />
              <Input label="Telepon Usaha (WhatsApp)" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} leftIcon={<Phone className="w-4 h-4" />} placeholder="Contoh: 6281234567890" />
            </div>
            <div className="mt-5 flex justify-end">
              <Button size="sm" onClick={handleSaveProfile} loading={profileSaving}>
                Simpan Perubahan
              </Button>
            </div>
          </Card>

          {/* WhatsApp Integration Card */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[var(--brand-600)]" />
                <h2 className="font-semibold text-[var(--text-primary)]">Integrasi WhatsApp Struk</h2>
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
              <div className="text-center py-6 text-sm text-[var(--text-secondary)]">
                Memuat status integrasi...
              </div>
            ) : waConnected ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-[var(--surface-raised)] p-4 border border-[var(--border)]">
                  <p className="text-sm font-medium text-[var(--text-primary)]">WhatsApp Terkoneksi</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Akun WhatsApp Anda telah aktif sebagai pengirim struk belanja otomatis.
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-[var(--text-primary)] font-bold">
                    <Phone className="w-4 h-4 text-[var(--brand-600)]" />
                    +{waPhone}
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    className="text-[var(--danger-600)] border-[var(--danger-200)] hover:bg-[var(--danger-50)]"
                    loading={waActionLoading}
                    onClick={handleWhatsAppLogout}
                  >
                    Putuskan Sesi WhatsApp
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  Pindai QR Code di bawah menggunakan WhatsApp Anda untuk mengaktifkan fitur kirim struk belanja otomatis ke pelanggan:
                  <ol className="list-decimal list-inside mt-2 space-y-1 text-xs">
                    <li>Buka aplikasi <b>WhatsApp</b> di HP Anda.</li>
                    <li>Pilih <b>Pengaturan / Setelan</b> &gt; <b>Perangkat Tertaut (Linked Devices)</b>.</li>
                    <li>Pilih <b>Tautkan Perangkat</b>, lalu arahkan kamera QR Code.</li>
                  </ol>
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-[var(--surface-raised)] rounded-xl border border-[var(--border)]">
                  {waQr ? (
                    <div className="relative p-3 bg-white rounded-lg border shadow-sm">
                      <img src={waQr} className="w-48 h-48" alt="WhatsApp QR Code" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-lg pointer-events-none"></div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center w-48 h-48 bg-white border rounded-lg">
                      <QrCode className="w-10 h-10 text-[var(--text-tertiary)] animate-pulse" />
                      <span className="text-[10px] text-[var(--text-tertiary)] mt-2">Menghasilkan QR...</span>
                    </div>
                  )}
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    Status QR otomatis di-refresh berkala
                  </p>
                </div>
              </div>
            )}
          </Card>

          {/* Team Card */}
          {canAccess("settings.users") ? (
            <Card>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[var(--brand-600)]" />
                  <h2 className="font-semibold text-[var(--text-primary)]">Tim</h2>
                </div>
                <Button size="sm" icon={<Users className="w-4 h-4" />} onClick={openInviteModal}>Undang Anggota</Button>
              </div>
              {teamError && (
                <div className="mb-4 rounded-lg border border-[var(--danger-200)] bg-[var(--danger-50)] p-3 text-sm text-[var(--danger-600)]">
                  {teamError}
                </div>
              )}
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={member.name} size="sm" className="flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{member.name}</p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">{member.email}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <Badge variant="brand" size="sm">{ROLES[member.role].label}</Badge>
                          {member.role === "cashier" && (
                            <Badge variant={member.branchName ? "success" : "warning"} size="sm" className="truncate max-w-[150px]">
                              {member.branchName ?? "Cabang belum diatur"}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {member.status === "invited" && <Badge variant="warning" size="sm" className="hidden sm:inline-flex">Diundang</Badge>}
                      {savingMemberId === member.id && <Badge variant="brand" size="sm">Menyimpan</Badge>}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenActionMemberId((current) => current === member.id ? null : member.id)}
                          disabled={savingMemberId === member.id}
                          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--border-hover)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] disabled:opacity-60 cursor-pointer"
                          aria-expanded={openActionMemberId === member.id}
                          aria-label={`Aksi ${member.name}`}
                        >
                          Aksi
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        {openActionMemberId === member.id && (
                          <div className="absolute right-0 top-full z-20 mt-2 w-36 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]">
                            <button
                              type="button"
                              onClick={() => {
                                setDetailMember(member);
                                setOpenActionMemberId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Detail
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                openEditMember(member);
                                setOpenActionMemberId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            {member.role !== "owner" && (
                              <button
                                type="button"
                                onClick={() => setOpenActionMemberId(null)}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-[var(--danger-500)] hover:bg-[var(--danger-50)]"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Hapus
                              </button>
                            )}
                          </div>
                        )}
                      </div>
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

          {/* Notifications Card */}
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
        </div>

        {/* Right Column — Secondary Navigation & Status */}
        <div className="space-y-6">
          <Link href="/dashboard/settings/billing" className="block">
            <Card hover className="cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400"><Shield className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)] text-sm">Tagihan & Langganan</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Kelola paket dan metode pembayaran</p>
                </div>
              </div>
            </Card>
          </Link>
          
          <Link href="/dashboard/branches" className="block">
            <Card hover className="cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg dark:bg-purple-900/30 dark:text-purple-400"><Building2 className="w-5 h-5" /></div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)] text-sm">Manajemen Cabang</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">Tambah atau kelola lokasi toko</p>
                </div>
              </div>
            </Card>
          </Link>

          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-[var(--brand-600)]" />
              <h2 className="font-semibold text-[var(--text-primary)] text-sm">Informasi Sistem</h2>
            </div>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Akun Anda</span>
                <span className="font-medium text-[var(--text-primary)]">{user.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Peran (Role)</span>
                <span className="font-medium text-[var(--text-primary)] capitalize">{user.role}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-[var(--border)]">
                <span className="text-[var(--text-secondary)]">Paket Tenant</span>
                <span className="font-medium text-[var(--text-primary)] uppercase">{user.tenant.plan || "starter"}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-[var(--text-secondary)]">Status Layanan</span>
                <Badge variant="success" size="sm">Online</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modals section */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Undang Anggota" size="md">
        <form onSubmit={submitInvite} className="space-y-4">
          <Input
            label="Nama"
            value={inviteForm.name}
            onChange={(event) => setInviteForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Nama anggota"
            required
          />
          <Input
            label="Email"
            type="email"
            value={inviteForm.email}
            onChange={(event) => setInviteForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="staff@bisnis.com"
            required
          />
          <Input
            label="Password awal"
            type="password"
            value={inviteForm.password}
            onChange={(event) => setInviteForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Minimal 8 karakter"
            required
            minLength={8}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Role</label>
            <select
              value={inviteForm.role}
              onChange={(event) => setInviteForm((current) => ({
                ...current,
                role: event.target.value as UserRole,
                branchId: event.target.value === "cashier" ? current.branchId || String(branches[0]?.id ?? "") : "",
              }))}
              className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
            >
              {(Object.keys(ROLES) as UserRole[]).filter((role) => role !== "superadmin").map((role) => (
                <option key={role} value={role}>{ROLES[role].label}</option>
              ))}
            </select>
          </div>
          {inviteForm.role === "cashier" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Cabang kerja</label>
              <select
                value={inviteForm.branchId}
                onChange={(event) => setInviteForm((current) => ({ ...current, branchId: event.target.value }))}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
                required
              >
                <option value="" disabled>Pilih cabang</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="rounded-lg bg-[var(--surface-raised)] p-3 text-xs leading-relaxed text-[var(--text-secondary)]">
            Untuk demo, akun dibuat langsung dengan password awal. Berikan email dan password ini ke anggota tim.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>Batal</Button>
            <Button type="submit" loading={inviteSaving}>Tambah Anggota</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detailMember} onClose={() => setDetailMember(null)} title="Detail Anggota" size="md">
        {detailMember && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-raised)] p-3">
              <Avatar name={detailMember.name} size="md" />
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{detailMember.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{detailMember.email}</p>
              </div>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                <span className="text-[var(--text-secondary)]">Role</span>
                <Badge variant="brand" size="sm">{ROLES[detailMember.role].label}</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                <span className="text-[var(--text-secondary)]">Cabang kerja</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {detailMember.role === "cashier" ? detailMember.branchName ?? "Belum diatur" : "Semua cabang"}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                <span className="text-[var(--text-secondary)]">Status</span>
                <Badge variant={detailMember.status === "active" ? "success" : "warning"} size="sm">
                  {detailMember.status === "active" ? "Aktif" : "Diundang"}
                </Badge>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDetailMember(null)}>Tutup</Button>
              <Button onClick={() => {
                openEditMember(detailMember);
                setDetailMember(null);
              }}>
                Edit
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!editingMember} onClose={() => setEditingMember(null)} title="Edit Anggota" size="md">
        {editingMember && (
          <form onSubmit={submitEditMember} className="space-y-4">
            <div className="rounded-lg bg-[var(--surface-raised)] p-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">{editingMember.name}</p>
              <p className="text-xs text-[var(--text-tertiary)]">{editingMember.email}</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Role</label>
              <select
                value={editForm.role}
                onChange={(event) => setEditForm((current) => ({
                  ...current,
                  role: event.target.value as UserRole,
                  branchId: event.target.value === "cashier" ? current.branchId || String(branches[0]?.id ?? "") : "",
                }))}
                className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
              >
                {(Object.keys(ROLES) as UserRole[]).filter((role) => role !== "superadmin").map((role) => (
                  <option key={role} value={role}>{ROLES[role].label}</option>
                ))}
              </select>
            </div>
            {editForm.role === "cashier" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-secondary)]">Cabang kerja</label>
                <select
                  value={editForm.branchId}
                  onChange={(event) => setEditForm((current) => ({ ...current, branchId: event.target.value }))}
                  className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
                  required
                >
                  <option value="" disabled>Pilih cabang</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditingMember(null)}>Batal</Button>
              <Button type="submit" loading={savingMemberId === editingMember.id}>Simpan</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
