// ===== NAPOS Constants =====

export const APP_NAME = "NAPOS";
export const APP_DESCRIPTION = "Smart Inventory & POS for Indonesian MSMEs";
export const APP_TAGLINE = "Capital Efficiency. Omnichannel Scalability.";

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
    description: "Perfect for getting started with your first store",
    skuLimit: 50,
    userLimit: 1,
    branchLimit: 1,
    features: [
      "Basic POS Terminal",
      "50 SKU Products",
      "1 User Account",
      "Daily Sales Report",
      "Digital Receipts",
      "Email Support",
    ],
    badge: "Free Forever",
  },
  {
    key: "basic",
    name: "Basic",
    price: 99000,
    annualPrice: 79000,
    description: "For growing businesses that need more insights",
    skuLimit: 500,
    userLimit: 3,
    branchLimit: 1,
    features: [
      "Everything in Starter",
      "500 SKU Products",
      "3 User Accounts",
      "Hourly Peak Analysis",
      "Barcode Scanner",
      "Offline POS Mode",
      "WhatsApp Receipts",
      "Priority Support",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    price: 249000,
    annualPrice: 199000,
    description: "Advanced analytics and inventory optimization",
    skuLimit: 5000,
    userLimit: 10,
    branchLimit: 3,
    features: [
      "Everything in Basic",
      "5,000 SKU Products",
      "10 User Accounts",
      "3 Branch Locations",
      "EOQ & ROP Optimization",
      "Stock Valuation Reports",
      "Profit & Loss Analysis",
      "Marketplace Integration",
      "Stock Transfer Between Branches",
    ],
    highlighted: true,
    badge: "Most Popular",
  },
  {
    key: "business",
    name: "Business",
    price: 499000,
    annualPrice: 399000,
    description: "Enterprise-grade tools for multi-location operations",
    skuLimit: "unlimited",
    userLimit: 25,
    branchLimit: 5,
    features: [
      "Everything in Growth",
      "Unlimited SKU Products",
      "25 User Accounts",
      "5 Branch Locations",
      "Multi-Branch Consolidation",
      "Omnichannel Sync (Shopee, Tokopedia)",
      "Advanced RBAC",
      "API Access",
      "Dedicated Account Manager",
      "Custom Reports",
    ],
    badge: "Enterprise",
  },
];

// ===== Roles =====
export type UserRole = "owner" | "manager" | "cashier" | "viewer";

export const ROLES: Record<UserRole, { label: string; description: string; color: string }> = {
  owner: { label: "Owner", description: "Full access to all features", color: "brand" },
  manager: { label: "Manager", description: "Manage inventory, staff, and reports", color: "indigo" },
  cashier: { label: "Cashier", description: "POS terminal and basic sales", color: "emerald" },
  viewer: { label: "Viewer", description: "View-only access to dashboards", color: "slate" },
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
  { label: "POS Terminal", href: "/dashboard/pos", icon: "ShoppingCart", roles: ["owner", "manager", "cashier"] },
  { label: "Inventory", href: "/dashboard/inventory", icon: "Package", roles: ["owner", "manager"] },
  { label: "Analytics", href: "/dashboard/analytics", icon: "BarChart3", roles: ["owner", "manager", "viewer"] },
  { label: "Channels", href: "/dashboard/channels", icon: "Globe", roles: ["owner", "manager"] },
  { label: "Branches", href: "/dashboard/branches", icon: "Building2", roles: ["owner"] },
  { label: "Settings", href: "/dashboard/settings", icon: "Settings", roles: ["owner", "manager"] },
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
