"use client";

import { useAuth } from "@/lib/auth-context";
import { Card, Button, Input, Avatar, Badge } from "@/components/ui";
import { ROLES, type UserRole } from "@/lib/constants";
import { Building2, Upload, Users, Bell, Shield, Mail, Phone, MapPin, Trash2 } from "lucide-react";
import Link from "next/link";

const TEAM_MEMBERS = [
  { id: "1", name: "Ahmad Rizki", email: "owner@napos.id", role: "owner" as UserRole, status: "active" },
  { id: "2", name: "Siti Nurhaliza", email: "manager@napos.id", role: "manager" as UserRole, status: "active" },
  { id: "3", name: "Budi Santoso", email: "cashier@napos.id", role: "cashier" as UserRole, status: "active" },
  { id: "4", name: "Dewi Lestari", email: "viewer@napos.id", role: "viewer" as UserRole, status: "active" },
  { id: "5", name: "Rudi Hartono", email: "rudi@napos.id", role: "manager" as UserRole, status: "invited" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-4xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Manage your business profile and preferences</p>
      </div>

      {/* Business Profile */}
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="w-5 h-5 text-[var(--brand-600)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Business Profile</h2>
        </div>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-[var(--brand-100)] rounded-xl flex items-center justify-center text-2xl font-bold text-[var(--brand-700)] dark:bg-[var(--brand-900)] dark:text-[var(--brand-300)]">
            TM
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)]">{user.tenant.name}</p>
            <Button variant="ghost" size="sm" className="mt-1"><Upload className="w-3.5 h-3.5" /> Change Logo</Button>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Business Name" defaultValue={user.tenant.name} leftIcon={<Building2 className="w-4 h-4" />} />
          <Input label="Email" defaultValue="info@tokomakmur.com" leftIcon={<Mail className="w-4 h-4" />} />
          <Input label="Phone" defaultValue="+6221-5551234" leftIcon={<Phone className="w-4 h-4" />} />
          <Input label="Address" defaultValue="Jl. Sudirman No. 45, Jakarta" leftIcon={<MapPin className="w-4 h-4" />} />
        </div>
        <div className="mt-4 flex justify-end"><Button size="sm">Save Changes</Button></div>
      </Card>

      {/* Team Management */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--brand-600)]" />
            <h2 className="font-semibold text-[var(--text-primary)]">Team Members</h2>
          </div>
          <Button size="sm" icon={<Users className="w-4 h-4" />}>Invite Member</Button>
        </div>
        <div className="space-y-3">
          {TEAM_MEMBERS.map((member) => (
            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--surface-raised)] transition-colors">
              <div className="flex items-center gap-3">
                <Avatar name={member.name} size="sm" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{member.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)]">{member.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {member.status === "invited" && <Badge variant="warning" size="sm">Invited</Badge>}
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

      {/* Notifications */}
      <Card>
        <div className="flex items-center gap-2 mb-6">
          <Bell className="w-5 h-5 text-[var(--brand-600)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Notifications</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: "Low stock alerts", desc: "Get notified when products fall below ROP", checked: true },
            { label: "New marketplace orders", desc: "Notification for new Shopee/Tokopedia orders", checked: true },
            { label: "Daily sales summary", desc: "End-of-day sales report via email", checked: false },
            { label: "Sync errors", desc: "Alert when marketplace sync fails", checked: true },
          ].map((item) => (
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

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/dashboard/settings/billing">
          <Card hover className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg dark:bg-blue-900/30 dark:text-blue-400"><Shield className="w-5 h-5" /></div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Billing & Subscription</p>
                <p className="text-xs text-[var(--text-secondary)]">Manage your plan and payment methods</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/dashboard/branches">
          <Card hover className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 text-purple-600 rounded-lg dark:bg-purple-900/30 dark:text-purple-400"><Building2 className="w-5 h-5" /></div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Branch Management</p>
                <p className="text-xs text-[var(--text-secondary)]">Add or manage your store locations</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
