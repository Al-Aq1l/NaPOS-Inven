"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, History, Info, Search } from "lucide-react";
import { Badge, Card, Input, Toast } from "@/components/ui";
import {
  fetchBranches,
  fetchOrders,
  fetchStockOpnames,
  fetchStockReceipts,
  fetchStockTransfers,
  type ApiBranch,
} from "@/lib/dashboard-api";
import { cn } from "@/lib/utils";

type MovementType = "stock-in" | "stock-out" | "transfer-out" | "transfer-in" | "opname" | "sale";

interface StockMovement {
  id: string;
  date: string;
  productName: string;
  sku: string;
  branchName: string;
  branchId: number | null;
  type: MovementType;
  label: string;
  qtyIn: number;
  qtyOut: number;
  stockAfter: number | null;
  reference: string;
  notes: string;
}

const TYPE_LABELS: Record<MovementType | "all", string> = {
  all: "Semua Tipe",
  "stock-in": "Stok Masuk",
  "stock-out": "Stok Keluar",
  "transfer-out": "Transfer Keluar",
  "transfer-in": "Transfer Masuk",
  opname: "Opname",
  sale: "Penjualan POS",
};

const TYPE_BADGES: Record<MovementType, "success" | "warning" | "danger" | "info" | "default" | "brand"> = {
  "stock-in": "success",
  "stock-out": "danger",
  "transfer-out": "warning",
  "transfer-in": "info",
  opname: "brand",
  sale: "default",
};

const PAGE_SIZE = 10;

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
        Menampilkan 10 dari {totalItems} riwayat
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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getMovementQtyClass(movement: StockMovement) {
  if (movement.qtyIn > 0) return "text-emerald-600";
  if (movement.qtyOut > 0) return "text-rose-600";
  return "text-[var(--text-secondary)]";
}

async function optionalList<T>(loader: () => Promise<T[]>): Promise<T[]> {
  try {
    return await loader();
  } catch {
    return [];
  }
}

export default function StockHistoryPage() {
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [type, setType] = useState<MovementType | "all">("all");
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

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
        const [branchData, receipts, opnames, transfers, orders] = await Promise.all([
          fetchBranches(),
          fetchStockReceipts(),
          optionalList(fetchStockOpnames),
          optionalList(fetchStockTransfers),
          fetchOrders(),
        ]);

        if (!mounted) return;

        const receiptMovements: StockMovement[] = receipts.flatMap((receipt) => (
          receipt.items ?? []
        ).map((item) => ({
          id: `receipt-${receipt.id}-${item.id}`,
          date: receipt.created_at,
          productName: item.product?.name ?? `Produk #${item.product_id}`,
          sku: item.product?.sku ?? "-",
          branchName: receipt.branch?.name ?? `Cabang #${receipt.branch_id}`,
          branchId: receipt.branch_id,
          type: "stock-in",
          label: TYPE_LABELS["stock-in"],
          qtyIn: item.quantity,
          qtyOut: 0,
          stockAfter: item.stock_after,
          reference: receipt.reference_number || `RCV-${receipt.id}`,
          notes: receipt.supplier_name || receipt.notes || "-",
        })));

        const opnameMovements: StockMovement[] = opnames.flatMap((opname) => (
          opname.items ?? []
        ).map((item) => {
          const isStockOut = (opname.notes ?? "").toLowerCase().startsWith("stok keluar");
          const variance = item.variance;
          const movementType: MovementType = isStockOut ? "stock-out" : "opname";

          return {
            id: `opname-${opname.id}-${item.id}`,
            date: opname.created_at,
            productName: item.product?.name ?? `Produk #${item.product_id}`,
            sku: item.product?.sku ?? "-",
            branchName: opname.branch?.name ?? `Cabang #${opname.branch_id}`,
            branchId: opname.branch_id,
            type: movementType,
            label: isStockOut ? TYPE_LABELS["stock-out"] : TYPE_LABELS.opname,
            qtyIn: variance > 0 ? variance : 0,
            qtyOut: variance < 0 ? Math.abs(variance) : 0,
            stockAfter: item.physical_stock,
            reference: `OPN-${opname.id}`,
            notes: opname.notes || "Penyesuaian stok",
          };
        }));

        const transferMovements: StockMovement[] = transfers.flatMap((transfer) => {
          if (transfer.status === "draft") return [];

          return (transfer.items ?? []).flatMap((item) => {
            const base = {
              date: transfer.updated_at || transfer.created_at,
              productName: item.product?.name ?? `Produk #${item.product_id}`,
              sku: item.product?.sku ?? "-",
              stockAfter: null,
              reference: `TRF-${transfer.id}`,
              notes: transfer.notes || `${transfer.from_branch?.name ?? "Cabang asal"} -> ${transfer.to_branch?.name ?? "Cabang tujuan"}`,
            };

            const outgoing: StockMovement = {
              ...base,
              id: `transfer-out-${transfer.id}-${item.id}`,
              branchName: transfer.from_branch?.name ?? `Cabang #${transfer.from_branch_id}`,
              branchId: transfer.from_branch_id,
              type: "transfer-out",
              label: TYPE_LABELS["transfer-out"],
              qtyIn: 0,
              qtyOut: item.quantity,
            };

            if (transfer.status !== "received") return [outgoing];

            return [
              outgoing,
              {
                ...base,
                id: `transfer-in-${transfer.id}-${item.id}`,
                branchName: transfer.to_branch?.name ?? `Cabang #${transfer.to_branch_id}`,
                branchId: transfer.to_branch_id,
                type: "transfer-in",
                label: TYPE_LABELS["transfer-in"],
                qtyIn: item.quantity,
                qtyOut: 0,
              },
            ];
          });
        });

        const saleMovements: StockMovement[] = orders.flatMap((order) => (
          order.items ?? []
        ).map((item) => ({
          id: `order-${order.id}-${item.id}`,
          date: order.created_at,
          productName: item.product?.name ?? `Produk #${item.product_id}`,
          sku: item.product?.sku ?? "-",
          branchName: order.branch?.name ?? `Cabang #${order.branch_id}`,
          branchId: order.branch_id,
          type: "sale",
          label: TYPE_LABELS.sale,
          qtyIn: 0,
          qtyOut: item.quantity,
          stockAfter: null,
          reference: `ORD-${order.id}`,
          notes: order.customer_name || order.payment_method || "-",
        })));

        setBranches(branchData);
        setMovements([...receiptMovements, ...opnameMovements, ...transferMovements, ...saleMovements]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } catch {
        if (!mounted) return;
        showToast("Gagal memuat riwayat stok.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredMovements = useMemo(() => {
    const query = search.trim().toLowerCase();

    return movements.filter((movement) => {
      const branchMatches = branchId === "all" || String(movement.branchId) === branchId;
      const typeMatches = type === "all" || movement.type === type;
      const searchMatches = !query ||
        movement.productName.toLowerCase().includes(query) ||
        movement.sku.toLowerCase().includes(query) ||
        movement.reference.toLowerCase().includes(query);

      return branchMatches && typeMatches && searchMatches;
    });
  }, [branchId, movements, search, type]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredMovements.length / PAGE_SIZE));
  const effectiveHistoryPage = Math.min(historyPage, historyTotalPages);
  const paginatedMovements = filteredMovements.slice((effectiveHistoryPage - 1) * PAGE_SIZE, effectiveHistoryPage * PAGE_SIZE);

  const totalIn = filteredMovements.reduce((sum, movement) => sum + movement.qtyIn, 0);
  const totalOut = filteredMovements.reduce((sum, movement) => sum + movement.qtyOut, 0);
  const netQty = totalIn - totalOut;

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast message={toastMsg} type="error" visible={toastVisible} />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Riwayat Stok</h1>
          <span
            title="Jejak mutasi stok dari stok masuk, stok keluar, transfer, opname, dan penjualan POS."
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[var(--text-tertiary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
          >
            <Info className="h-3.5 w-3.5" />
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">Audit pergerakan stok produk di semua cabang.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <ArrowDownToLine className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Total Masuk</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{totalIn}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
            <ArrowUpFromLine className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Total Keluar</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{totalOut}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
            <History className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-medium text-[var(--text-tertiary)]">Net Movement</p>
            <p className={cn("text-xl font-bold", netQty >= 0 ? "text-emerald-600" : "text-rose-600")}>{netQty}</p>
          </div>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_12rem_12rem]">
          <Input
            leftIcon={<Search className="h-4 w-4" />}
            placeholder="Cari produk, SKU, atau referensi..."
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
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value as MovementType | "all");
              setHistoryPage(1);
            }}
            className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)]"
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                <th className="py-3 pr-4">Tanggal</th>
                <th className="py-3 pr-4">Produk</th>
                <th className="py-3 pr-4">Cabang</th>
                <th className="py-3 pr-4">Tipe</th>
                <th className="py-3 pr-4 text-right">Masuk</th>
                <th className="py-3 pr-4 text-right">Keluar</th>
                <th className="py-3 pr-4 text-right">Stok Akhir</th>
                <th className="py-3 pr-4">Referensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[var(--text-secondary)]">Memuat riwayat stok...</td>
                </tr>
              )}
              {!loading && filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[var(--text-secondary)]">Tidak ada riwayat stok sesuai filter.</td>
                </tr>
              )}
              {!loading && paginatedMovements.map((movement) => (
                <tr key={movement.id} className="hover:bg-[var(--surface-raised)]">
                  <td className="py-3 pr-4 text-xs text-[var(--text-secondary)] whitespace-nowrap">{formatDateTime(movement.date)}</td>
                  <td className="py-3 pr-4">
                    <p className="font-semibold text-[var(--text-primary)]">{movement.productName}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{movement.sku}</p>
                  </td>
                  <td className="py-3 pr-4 text-[var(--text-secondary)]">{movement.branchName}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={TYPE_BADGES[movement.type]}>{movement.label}</Badge>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-emerald-600">{movement.qtyIn || "-"}</td>
                  <td className={cn("py-3 pr-4 text-right font-semibold", getMovementQtyClass(movement))}>{movement.qtyOut || "-"}</td>
                  <td className="py-3 pr-4 text-right text-[var(--text-secondary)]">{movement.stockAfter ?? "-"}</td>
                  <td className="py-3 pr-4">
                    <p className="font-mono text-xs text-[var(--text-primary)]">{movement.reference}</p>
                    <p className="max-w-48 truncate text-xs text-[var(--text-tertiary)]">{movement.notes}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls
          page={effectiveHistoryPage}
          totalPages={historyTotalPages}
          totalItems={filteredMovements.length}
          onPageChange={(nextPage) => setHistoryPage(Math.min(Math.max(1, nextPage), historyTotalPages))}
        />
      </Card>
    </div>
  );
}
