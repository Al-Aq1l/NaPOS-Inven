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
