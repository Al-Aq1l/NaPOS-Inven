"use client";

import { useEffect, useMemo, useState } from "react";
import { ReceiptText, Info, Search, Calendar as CalendarIcon, ArrowUpRight, DollarSign, Activity, Eye } from "lucide-react";
import { Badge, Card, Input, Toast, Modal, DataTable } from "@/components/ui";
import { fetchOrders, fetchBranches, type ApiBranch, type ApiOrder } from "@/lib/dashboard-api";
import { formatIDR } from "@/lib/constants";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function PaginationControls({
  page,
  totalPages,
  totalItems,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  if (totalItems <= PAGE_SIZE) return null;

  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-medium text-[var(--text-tertiary)]">
        Menampilkan {Math.min(PAGE_SIZE, totalItems - (page - 1) * PAGE_SIZE)} dari {totalItems} transaksi
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="h-8 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--surface-raised)]"
        >
          Sebelumnya
        </button>
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="h-8 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50 hover:bg-[var(--surface-raised)]"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

export default function SalesHistoryPage() {
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [dateFilter, setDateFilter] = useState("all"); // all, today, week, month
  const [historyPage, setHistoryPage] = useState(1);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ApiOrder | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        const [branchData, orderData] = await Promise.all([
          fetchBranches(),
          fetchOrders(),
        ]);

        if (!mounted) return;
        setBranches(branchData);
        // Sort newest first
        setOrders(orderData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } catch {
        if (!mounted) return;
        showToast("Gagal memuat riwayat penjualan.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    const now = new Date();
    
    return orders.filter((order) => {
      const branchMatches = branchId === "all" || String(order.branch_id) === branchId;
      const searchMatches = !query ||
        `ORD-${order.id}`.toLowerCase().includes(query) ||
        (order.customer_name || "").toLowerCase().includes(query);
      
      let dateMatches = true;
      if (dateFilter !== "all") {
        const orderDate = new Date(order.created_at);
        if (dateFilter === "today") {
          dateMatches = orderDate.toDateString() === now.toDateString();
        } else if (dateFilter === "week") {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          dateMatches = orderDate >= weekAgo;
        } else if (dateFilter === "month") {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          dateMatches = orderDate >= monthAgo;
        }
      }

      return branchMatches && searchMatches && dateMatches;
    });
  }, [branchId, orders, search, dateFilter]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const effectiveHistoryPage = Math.min(historyPage, historyTotalPages);
  const paginatedOrders = filteredOrders.slice((effectiveHistoryPage - 1) * PAGE_SIZE, effectiveHistoryPage * PAGE_SIZE);

  // Aggregations
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
  const totalHpp = filteredOrders.reduce((sum, order) => {
    const orderHpp = (order.items || []).reduce((subSum, item) => {
      const cost = parseFloat(item.product?.cost_price || "0");
      return subSum + (cost * item.quantity);
    }, 0);
    return sum + orderHpp;
  }, 0);
  const totalMargin = totalRevenue - totalHpp;

  const getOrderStatusBadge = (status: string) => {
    if (status === "completed") return <Badge variant="success">Selesai</Badge>;
    if (status === "refunded") return <Badge variant="danger">Refund</Badge>;
    if (status === "pending") return <Badge variant="warning">Tertunda</Badge>;
    return <Badge variant="default">{status}</Badge>;
  };

  const calculateOrderMetrics = (order: ApiOrder) => {
    const revenue = parseFloat(order.total_amount);
    const hpp = (order.items || []).reduce((sum, item) => sum + (parseFloat(item.product?.cost_price || "0") * item.quantity), 0);
    const margin = revenue - hpp;
    const marginPercent = revenue > 0 ? (margin / revenue) * 100 : 0;
    return { revenue, hpp, margin, marginPercent };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast message={toastMsg} type="error" visible={toastVisible} />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Riwayat Penjualan</h1>
          <div className="relative group flex items-center cursor-help">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] transition-colors">
              <Info className="h-3.5 w-3.5" />
            </span>
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 p-2.5 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-lg shadow-xl hidden group-hover:block z-50 pointer-events-none font-medium leading-relaxed border border-slate-700 dark:border-slate-600">
              <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
              Daftar transaksi penjualan, detail HPP, margin, dan informasi pembeli.
            </div>
          </div>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">Monitor transaksi penjualan, margin laba, dan data pelanggan.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <ReceiptText className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Total Transaksi</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{filteredOrders.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <DollarSign className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Total Pendapatan</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{formatIDR(totalRevenue)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <Activity className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Total HPP</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{formatIDR(totalHpp)}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
            <ArrowUpRight className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Total Margin Laba</p>
            <p className="text-xl font-bold text-purple-600">{formatIDR(totalMargin)}</p>
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem]">
          <Input
            leftIcon={<Search className="h-4 w-4" />}
            placeholder="Cari ID transaksi, nama pelanggan..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setHistoryPage(1);
            }}
          />
          <select
            value={branchId}
            onChange={(event) => {
              setBranchId(event.target.value);
              setHistoryPage(1);
            }}
            className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
          >
            <option value="all">Semua Cabang</option>
            {branches.map((branch) => <option key={branch.id} value={String(branch.id)}>{branch.name}</option>)}
          </select>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[var(--text-tertiary)]">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <select
              value={dateFilter}
              onChange={(event) => {
                setDateFilter(event.target.value);
                setHistoryPage(1);
              }}
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm text-[var(--text-primary)] appearance-none"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="week">7 Hari Terakhir</option>
              <option value="month">30 Hari Terakhir</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                <th className="py-3 pr-4">ID Transaksi</th>
                <th className="py-3 pr-4">Tanggal</th>
                <th className="py-3 pr-4">Cabang</th>
                <th className="py-3 pr-4">Pelanggan</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4 text-right">Pendapatan</th>
                <th className="py-3 pr-4 text-right">HPP</th>
                <th className="py-3 pr-4 text-right">Margin Laba</th>
                <th className="py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[var(--text-secondary)]">Memuat riwayat penjualan...</td>
                </tr>
              )}
              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-[var(--text-secondary)]">Tidak ada transaksi ditemukan.</td>
                </tr>
              )}
              {!loading && paginatedOrders.map((order) => {
                const { revenue, hpp, margin, marginPercent } = calculateOrderMetrics(order);
                return (
                  <tr key={order.id} className="hover:bg-[var(--surface-raised)] group transition-colors">
                    <td className="py-3 pr-4 font-mono text-xs font-semibold text-[var(--text-primary)]">ORD-{order.id.toString().padStart(5, '0')}</td>
                    <td className="py-3 pr-4 text-xs text-[var(--text-secondary)] whitespace-nowrap">{formatDateTime(order.created_at)}</td>
                    <td className="py-3 pr-4 text-[var(--text-secondary)]">{order.branch?.name || `Cabang #${order.branch_id}`}</td>
                    <td className="py-3 pr-4 font-medium text-[var(--text-primary)]">{order.customer_name || "-"}</td>
                    <td className="py-3 pr-4">{getOrderStatusBadge(order.status)}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-emerald-600">{formatIDR(revenue)}</td>
                    <td className="py-3 pr-4 text-right text-orange-600">{formatIDR(hpp)}</td>
                    <td className="py-3 pr-4 text-right font-semibold text-purple-600">
                      <div className="flex flex-col items-end">
                        <span>{formatIDR(margin)}</span>
                        <span className="text-[10px] bg-purple-50 px-1.5 py-0.5 rounded text-purple-700">{marginPercent.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] dark:hover:bg-slate-700 hover:text-blue-600 hover:border-blue-200 dark:hover:border-blue-800 transition-all shadow-sm active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={effectiveHistoryPage}
          totalPages={historyTotalPages}
          totalItems={filteredOrders.length}
          onPageChange={(nextPage) => setHistoryPage(Math.min(Math.max(1, nextPage), historyTotalPages))}
        />
      </Card>

      <Modal
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `Detail Transaksi: ORD-${selectedOrder.id.toString().padStart(5, '0')}` : "Detail Transaksi"}
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pb-6 border-b border-[var(--border)]">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Tanggal Waktu</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{formatDateTime(selectedOrder.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Pelanggan</p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{selectedOrder.customer_name || "Umum"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Metode Pembayaran</p>
                <p className="text-sm font-semibold uppercase text-[var(--text-primary)]">{selectedOrder.payment_method}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] mb-1">Status</p>
                <div className="mt-1">{getOrderStatusBadge(selectedOrder.status)}</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Item Produk</h4>
              <div className="border border-[var(--border)] rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="bg-[var(--surface-raised)] border-b border-[var(--border)] text-xs text-[var(--text-secondary)] font-medium">
                      <th className="py-2.5 px-4">Produk</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Harga Jual</th>
                      <th className="py-2.5 px-4 text-right">HPP</th>
                      <th className="py-2.5 px-4 text-right">Margin Laba</th>
                      <th className="py-2.5 px-4 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {(selectedOrder.items || []).map((item) => {
                      const cost = parseFloat(item.product?.cost_price || "0");
                      const sell = parseFloat(item.price);
                      const subtotal = parseFloat(item.subtotal);
                      const marginItem = (sell - cost) * item.quantity;
                      const marginItemPercent = sell > 0 ? ((sell - cost) / sell) * 100 : 0;
                      
                      return (
                        <tr key={item.id} className="text-[var(--text-primary)]">
                          <td className="py-2.5 px-4">
                            <p className="font-semibold">{item.product?.name || `Produk #${item.product_id}`}</p>
                            <p className="text-xs text-[var(--text-tertiary)]">{item.product?.sku}</p>
                          </td>
                          <td className="py-2.5 px-4 text-center font-medium">{item.quantity}</td>
                          <td className="py-2.5 px-4 text-right text-[var(--text-secondary)]">{formatIDR(sell)}</td>
                          <td className="py-2.5 px-4 text-right text-[var(--text-secondary)]">{formatIDR(cost)}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-purple-600">
                            <div className="flex flex-col items-end">
                              <span>{formatIDR(marginItem)}</span>
                              <span className="text-[10px] text-purple-500">{marginItemPercent.toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold">{formatIDR(subtotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-[var(--surface-raised)] font-semibold border-t border-[var(--border)] text-[var(--text-primary)]">
                    <tr>
                      <td colSpan={5} className="py-3 px-4 text-right">Total Transaksi:</td>
                      <td className="py-3 px-4 text-right text-emerald-600">{formatIDR(parseFloat(selectedOrder.total_amount))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-[var(--surface-raised)] hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--text-primary)] font-medium rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
