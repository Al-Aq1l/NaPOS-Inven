import api from "@/lib/api";

export interface ApiBranch {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  status: "online" | "offline";
}

export interface ApiCategory {
  id: number;
  name: string;
  slug: string;
}

export interface ApiProduct {
  id: number;
  category_id: number | null;
  sku: string | null;
  barcode: string | null;
  name: string;
  image_path?: string | null;
  image_url?: string | null;
  cost_price: string;
  sell_price: string;
  rop: number;
  lead_time?: number | null;
  unit: string;
  status: "active" | "inactive";
  category?: ApiCategory | null;
  branches?: Array<ApiBranch & { pivot?: { stock: number } }>;
}

export interface ApiOrderItem {
  id: number;
  product_id: number;
  quantity: number;
  price: string;
  subtotal: string;
  product?: ApiProduct;
}

export interface ApiOrder {
  id: number;
  branch_id: number;
  user_id: number;
  customer_name: string | null;
  total_amount: string;
  status: string;
  payment_method: string;
  created_at: string;
  branch?: ApiBranch;
  items?: ApiOrderItem[];
}

export interface ApiStockReceiptItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_cost: string;
  subtotal: string;
  stock_before: number;
  stock_after: number;
  product?: ApiProduct;
}

export interface ApiStockReceipt {
  id: number;
  branch_id: number;
  supplier_name: string | null;
  reference_number: string | null;
  notes: string | null;
  total_cost: string;
  created_at: string;
  branch?: ApiBranch;
  items?: ApiStockReceiptItem[];
}

export interface ApiStockOpnameItem {
  id: number;
  product_id: number;
  system_stock: number;
  physical_stock: number;
  variance: number;
  product?: ApiProduct;
}

export interface ApiStockOpname {
  id: number;
  branch_id: number;
  status: string;
  notes: string | null;
  created_at: string;
  branch?: ApiBranch;
  items?: ApiStockOpnameItem[];
}

export interface ApiStockTransferItem {
  id: number;
  product_id: number;
  quantity: number;
  product?: ApiProduct;
}

export interface ApiStockTransfer {
  id: number;
  from_branch_id: number;
  to_branch_id: number;
  status: "draft" | "in-transit" | "received";
  notes: string | null;
  created_at: string;
  updated_at: string;
  from_branch?: ApiBranch;
  to_branch?: ApiBranch;
  items?: ApiStockTransferItem[];
}

export interface InventoryOptimizationItem {
  id: number;
  name: string;
  sku: string;
  annualDemand: number;
  orderingCost: number;
  holdingCostPerUnit: number;
  eoq: number;
  currentOrderQty: number;
  leadTimeDays: number;
  hasCustomLeadTime: boolean;
  avgDailyUsage: number;
  totalSold: number;
  activeDays: number;
  safetyStock: number;
  rop: number;
  suggested_rop: number;
  currentStock: number;
}

export interface DashboardSummary {
  total_revenue: number;
  total_orders: number;
  today_revenue: number;
  today_orders: number;
  branch_count: number;
  product_count: number;
  sales_trend: Array<{ date: string; label: string; total: number; orders: number }>;
  recent_orders: Array<{
    id: number;
    customer_name: string | null;
    total_amount: string | number;
    status: string;
    payment_method?: string;
    created_at: string;
    item_count: number;
  }>;
  low_stock: Array<{
    id: number;
    name: string;
    sku: string | null;
    category_name?: string | null;
    rop: number;
    stock: number;
  }>;
}

export interface BillingInfo {
  tenant_id: number;
  plan: "starter" | "basic" | "growth" | "business";
  is_active: boolean;
  trial_ends_at: string | null;
  limits: {
    max_sku: number | null;
    max_branches: number;
    max_users: number;
    features: string[];
  };
  usage: {
    sku: number;
    branches: number;
    users: number;
  };
}

export interface BillingUpgradeRequest {
  message: string;
  requested_plan: string;
  current_plan: string;
  status: "pending";
}

export async function fetchDashboardSummary() {
  const res = await api.get<DashboardSummary>("/dashboard/summary");
  return res.data;
}

export async function fetchBranches() {
  const res = await api.get<ApiBranch[]>("/branches");
  return res.data;
}

export async function createBranch(data: { name: string; address?: string; phone?: string; status?: "online" | "offline" }) {
  const res = await api.post<ApiBranch>("/branches", data);
  return res.data;
}

export async function fetchCategories() {
  const res = await api.get<ApiCategory[]>("/categories");
  return res.data;
}

export async function createCategory(name: string) {
  const res = await api.post<ApiCategory>("/categories", { name });
  return res.data;
}

export async function fetchProducts() {
  const res = await api.get<ApiProduct[]>("/products");
  return res.data;
}

export async function fetchOrders() {
  const res = await api.get<ApiOrder[]>("/orders");
  return res.data;
}

export async function fetchStockReceipts() {
  const res = await api.get<ApiStockReceipt[]>("/stock-receipts");
  return res.data;
}

export async function fetchStockOpnames() {
  const res = await api.get<ApiStockOpname[]>("/stock-opname");
  return res.data;
}

export async function fetchStockTransfers() {
  const res = await api.get<ApiStockTransfer[]>("/transfers");
  return res.data;
}

export async function fetchBillingInfo() {
  const res = await api.get<BillingInfo>("/billing");
  return res.data;
}

export async function requestPlanChange(plan: string) {
  const res = await api.post<BillingUpgradeRequest>("/billing/upgrade", { plan });
  return res.data;
}

export async function fetchInventoryOptimization(params?: { lead_time_days?: number; ordering_cost?: number; holding_cost_rate?: number }): Promise<InventoryOptimizationItem[]> {
  const res = await api.get<InventoryOptimizationItem[]>("/inventory/optimization", { params });
  return res.data;
}

export interface AnalyticsData {
  total_revenue: number;
  total_transactions: number;
  total_hpp: number;
  total_margin: number;
  avg_basket: number;
  unique_customers: number;
  stock_valuation: number;
  sales_trend: Array<{ date: string; label: string; total: number; orders: number }>;
  hourly_data: Array<{ hour: number; count: number }>;
  top_products: Array<{ name: string; qty: number; price: number }>;
  category_data: Array<{ name: string; count: number }>;
  low_stock_products: Array<{ id: number; name: string; sku: string; rop: number; stock: number; category_name: string | null }>;
}

export async function fetchAnalytics(params?: { branch_id?: number | null; range?: string }) {
  const res = await api.get<AnalyticsData>("/analytics", { params });
  return res.data;
}

export interface WhatsAppStatus {
  connected: boolean;
  phone: string | null;
  error?: string;
}

export async function fetchWhatsAppStatus() {
  const res = await api.get<WhatsAppStatus>("/whatsapp/status");
  return res.data;
}

export async function fetchWhatsAppQr() {
  const res = await api.get<{ qr?: string; message?: string }>("/whatsapp/qr");
  return res.data;
}

export async function postWhatsAppLogout() {
  const res = await api.post<{ success: boolean; message?: string }>("/whatsapp/logout");
  return res.data;
}

export async function postWhatsAppSendReceipt(orderId: number, phone: string) {
  const res = await api.post<{ success: boolean; message: string }>(`/whatsapp/send-receipt/${orderId}`, { phone });
  return res.data;
}
