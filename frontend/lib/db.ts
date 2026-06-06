import Dexie, { type Table } from 'dexie';

export interface LocalProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  sku: string;
  barcode: string;
  imageUrl?: string | null;
  stock: number;
  branchStocks: Record<number, number>;
  rop: number;
}

export interface LocalOrderItem {
  product_id: number;
  quantity: number;
  name: string;
  price: number;
  discount_amount?: number;
  subtotal?: number;
}

export interface LocalOrder {
  id?: number; // Primary key untuk IndexedDB (auto-increment)
  uuid: string; // Unique ID untuk melacak transaksi & mencegah duplikasi di server
  branch_id: number;
  customer_name: string;
  payment_method: 'cash' | 'qris' | 'transfer';
  items: LocalOrderItem[];
  total_amount: number;
  created_at: string;
  status: 'pending' | 'synced' | 'failed';
  error_message?: string;
}

export class NaPosDatabase extends Dexie {
  products!: Table<LocalProduct, string>;
  pendingOrders!: Table<LocalOrder, number>;

  constructor() {
    super('NaPosDatabase');
    this.version(1).stores({
      products: 'id, name, sku, barcode',
      pendingOrders: '++id, uuid, status, created_at',
    });
  }
}

export const db = new NaPosDatabase();
