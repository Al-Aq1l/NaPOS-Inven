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
  avgDailyUsage: number;
  safetyStock: number;
  rop: number;
  suggested_rop: number;
  currentStock: number;
}

export interface DashboardSummary {
  total_revenue: number;
  total_orders: number;
  branch_count: number;
  sales_trend: Array<{ day: number; total: number }>;
  recent_orders: Array<{
    id: number;
    customer_name: string | null;
    total_amount: string | number;
    status: string;
    created_at: string;
    item_count: number;
  }>;
  low_stock: Array<{
    id: number;
    name: string;
    sku: string | null;
    rop: number;
    stock: number;
  }>;
}

export async function fetchDashboardSummary() {
  const res = await api.get<DashboardSummary>("/dashboard/summary");
  return res.data;
}

export async function fetchBranches() {
  const res = await api.get<ApiBranch[]>("/branches");
  return res.data;
}

export async function fetchCategories() {
  const res = await api.get<ApiCategory[]>("/categories");
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

export async function fetchInventoryOptimization(params?: { ordering_cost?: number; holding_cost_rate?: number }) {
  const res = await api.get<InventoryOptimizationItem[]>("/inventory/optimization", { params });
  return res.data;
}
