// ===== NAPOS Constants =====

export const APP_NAME = "NAPOS";
export const APP_DESCRIPTION = "Smart Inventory & POS untuk UMKM Indonesia";
export const APP_TAGLINE = "Efisiensi Modal. Skalabilitas Omnichannel.";

// ===== Pricing Tiers =====
export type TierKey = "starter" | "basic" | "growth" | "business";

export interface PricingTier {
  key: TierKey;
  name: string;
  price: number; // IDR per month
  annualPrice: number;
  description: string;
  skuLimit: number | "unlimited";
  userLimit: number;
  branchLimit: number;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

export const PRICING_TIERS: PricingTier[] = [
  {
    key: "starter",
    name: "Starter",
    price: 0,
    annualPrice: 0,
    description: "Cocok untuk mulai operasional toko pertama",
    skuLimit: 30,
    userLimit: 1,
    branchLimit: 1,
    features: [
      "POS dasar",
      "Maks 30 SKU",
      "1 akun admin",
      "Laporan penjualan harian",
      "Nota digital PDF",
      "Dukungan email",
    ],
    badge: "Gratis",
  },
  {
    key: "basic",
    name: "Basic",
    price: 45000,
    annualPrice: 36000,
    description: "Untuk toko tunggal yang butuh analitik operasional",
    skuLimit: 500,
    userLimit: 2,
    branchLimit: 1,
    features: [
      "Semua fitur Starter",
      "Maks 500 SKU",
      "2 akun pengguna",
      "Analisis jam ramai",
      "Scan barcode",
      "POS offline (IndexedDB)",
      "Nota WhatsApp manual",
      "Laporan per toko",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    price: 95000,
    annualPrice: 76000,
    description: "Optimasi inventaris dan analitik multi-cabang",
    skuLimit: "unlimited",
    userLimit: 5,
    branchLimit: 2,
    features: [
      "Semua fitur Basic",
      "SKU unlimited",
      "5 akun pengguna",
      "Maks 2 cabang",
      "Engine EOQ & ROP",
      "Valuasi stok",
      "Laporan profit & HPP",
      "Integrasi 1 marketplace",
      "Transfer stok antar cabang",
    ],
    highlighted: true,
    badge: "Paling Populer",
  },
  {
    key: "business",
    name: "Business",
    price: 195000,
    annualPrice: 156000,
    description: "Untuk ekspansi: konsolidasi grup dan omnichannel penuh",
    skuLimit: "unlimited",
    userLimit: 99,
    branchLimit: 5,
    features: [
      "Semua fitur Growth",
      "SKU unlimited",
      "Multi user (hingga 99)",
      "Hingga 5 cabang",
      "Konsolidasi laporan grup",
      "Omnichannel semua marketplace",
      "RBAC lanjutan",
      "API akses",
      "Dedicated support",
      "Laporan kustom",
    ],
    badge: "Skala Bisnis",
  },
];

// ===== Roles =====
export type UserRole = "owner" | "manager" | "cashier" | "viewer";

export const ROLES: Record<UserRole, { label: string; description: string; color: string }> = {
  owner: { label: "Pemilik", description: "Akses penuh ke semua fitur", color: "brand" },
  manager: { label: "Manajer", description: "Kelola stok, tim, dan laporan", color: "indigo" },
  cashier: { label: "Kasir", description: "Akses kasir dan penjualan dasar", color: "emerald" },
  viewer: { label: "Pemantau", description: "Hanya melihat dashboard", color: "slate" },
};

// ===== Navigation =====
export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  roles: UserRole[];
  badge?: string;
}

export const DASHBOARD_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", roles: ["owner", "manager", "cashier", "viewer"] },
  { label: "Kasir POS", href: "/dashboard/pos", icon: "ShoppingCart", roles: ["owner", "manager", "cashier"] },
  { label: "Stok", href: "/dashboard/inventory", icon: "Package", roles: ["owner", "manager"] },
  { label: "Analitik", href: "/dashboard/analytics", icon: "BarChart3", roles: ["owner", "manager", "viewer"] },
  { label: "Omnichannel", href: "/dashboard/channels", icon: "Globe", roles: ["owner", "manager"] },
  { label: "Cabang", href: "/dashboard/branches", icon: "Building2", roles: ["owner", "manager"] },
  { label: "Pengaturan", href: "/dashboard/settings", icon: "Settings", roles: ["owner", "manager"] },
];

// ===== API =====
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ===== Currency =====
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("id-ID").format(num);
}

export function formatCompact(num: number): string {
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
}
