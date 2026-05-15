"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, QrCode, Banknote, Send, Printer, ShoppingCart } from "lucide-react";
import { Button, Badge, Input, Modal, ConnectionStatus, Card } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { fetchProducts, type ApiProduct } from "@/lib/dashboard-api";

interface Produk {
  id: string;
  name: string;
  price: number;
  category: string;
  sku: string;
  image: string;
  stock: number;
}

interface KeranjangItem extends Produk {
  quantity: number;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function mapProdukFromApi(item: ApiProduct): Produk {
  const stock = (item.branches ?? []).reduce((sum, b) => sum + (b.pivot?.stock ?? 0), 0);
  return {
    id: String(item.id),
    name: item.name,
    price: Number(item.sell_price),
    category: item.category?.name ?? "Lainnya",
    sku: item.sku ?? `SKU-${item.id}`,
    image: initialsFromName(item.name),
    stock,
  };
}

export default function POSPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [produk, setProduk] = useState<Produk[]>([]);
  const [cart, setCart] = useState<KeranjangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptId, setReceiptId] = useState("ORD-1001");
  const [receiptTime, setReceiptTime] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchProducts();
        if (!isMounted) return;
        setProduk(data.map(mapProdukFromApi));
      } catch {
        if (!isMounted) return;
        setError("Gagal memuat data produk POS.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const kategori = useMemo(() => ["Semua", ...new Set(produk.map((p) => p.category))], [produk]);

  const filtered = useMemo(
    () =>
      produk.filter(
        (p) =>
          (category === "Semua" || p.category === category) &&
          (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())),
      ),
    [produk, search, category],
  );

  const addToCart = (product: Produk) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id);
      if (existing) return prev.map((c) => (c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)).filter((c) => c.quantity > 0));
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;
  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handlePembayaran = () => {
    setPaymentOpen(false);
    setReceiptId(`ORD-${Math.floor(1000 + Math.random() * 9000)}`);
    setReceiptTime(new Date().toLocaleTimeString("id-ID"));
    setReceiptOpen(true);
  };

  const handlePesananBaru = () => {
    setReceiptOpen(false);
    setCart([]);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 lg:-m-6">
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border)]">
        <div className="p-4 border-b border-[var(--border)] space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Cari produk atau scan barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                rightIcon={<button className="p-1 hover:bg-[var(--surface-raised)] rounded cursor-pointer"><QrCode className="w-4 h-4" /></button>}
              />
            </div>
            <ConnectionStatus isOnline className="hidden sm:flex" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {kategori.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer",
                  category === cat
                    ? "bg-[var(--brand-600)] text-white"
                    : "bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--slate-200)] dark:hover:bg-[var(--slate-700)]",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && <Card><p className="text-sm text-[var(--text-secondary)]">Memuat produk...</p></Card>}
          {error && <Card><p className="text-sm text-[var(--danger-500)]">{error}</p></Card>}
          {!loading && !error && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="flex flex-col items-center p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--brand-300)] hover:shadow-[var(--shadow-sm)] transition-all duration-150 cursor-pointer active:scale-[0.97] text-left"
                >
                  <span className="text-lg mb-2 w-11 h-11 rounded-full bg-[var(--surface-raised)] flex items-center justify-center font-semibold text-[var(--text-primary)]">{product.image}</span>
                  <p className="text-sm font-medium text-[var(--text-primary)] text-center leading-tight line-clamp-2 w-full">{product.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1">{product.sku}</p>
                  <p className="text-sm font-bold text-[var(--brand-600)] mt-1.5">{formatIDR(product.price)}</p>
                  <Badge variant={product.stock < 10 ? "warning" : "success"} size="sm" className="mt-1.5">
                    Stok: {product.stock}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:flex w-80 lg:w-96 flex-col bg-[var(--surface)]">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Keranjang
            </h2>
            {cart.length > 0 && <Badge variant="brand">{itemCount} item</Badge>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="w-12 h-12 text-[var(--text-tertiary)] mb-3 opacity-30" />
              <p className="text-sm text-[var(--text-tertiary)]">Keranjang masih kosong</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Pilih produk untuk menambahkan</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 bg-[var(--surface-raised)] rounded-lg">
                  <span className="text-sm w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center font-semibold text-[var(--text-primary)] flex-shrink-0">{item.image}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">{formatIDR(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--slate-100)] transition-colors cursor-pointer">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold text-[var(--text-primary)]">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-md bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--slate-100)] transition-colors cursor-pointer">
                      <Plus className="w-3 h-3" />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--danger-500)] hover:bg-[var(--danger-50)] transition-colors cursor-pointer ml-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-[var(--border)] p-4 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Subtotal</span><span>{formatIDR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Pajak (11%)</span><span>{formatIDR(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border)]">
                <span>Total</span><span>{formatIDR(total)}</span>
              </div>
            </div>
            <Button onClick={() => setPaymentOpen(true)} className="w-full" size="lg">
              <CreditCard className="w-5 h-5" /> Bayar {formatIDR(total)}
            </Button>
          </div>
        )}
      </div>

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Pembayaran" size="sm">
        <div className="space-y-4">
          <div className="text-center p-4 bg-[var(--surface-raised)] rounded-lg">
            <p className="text-sm text-[var(--text-secondary)]">Total Bayar</p>
            <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{formatIDR(total)}</p>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Metode Pembayaran</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Banknote, label: "Tunai" },
              { icon: CreditCard, label: "Kartu" },
              { icon: QrCode, label: "QRIS" },
            ].map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={handlePembayaran}
                className="flex flex-col items-center gap-2 p-4 border border-[var(--border)] rounded-xl hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)] transition-all cursor-pointer dark:hover:bg-[var(--brand-950)]"
              >
                <Icon className="w-6 h-6 text-[var(--text-secondary)]" />
                <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>
              </button>
            ))}
          </div>
          <Input label="Nama Pelanggan (opsional)" placeholder="Pelanggan Umum" />
        </div>
      </Modal>

      <Modal open={receiptOpen} onClose={handlePesananBaru} title="Struk" size="sm">
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3 dark:bg-green-900/30 dark:text-green-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Pembayaran Berhasil</h3>
            <p className="text-2xl font-bold text-[var(--brand-600)] mt-1">{formatIDR(total)}</p>
          </div>
          <div className="border border-[var(--border)] rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Pesanan</span><span className="font-medium text-[var(--text-primary)]">#{receiptId}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Item</span><span className="font-medium text-[var(--text-primary)]">{itemCount}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Waktu</span><span className="font-medium text-[var(--text-primary)]">{receiptTime}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm"><Printer className="w-4 h-4" /> Cetak</Button>
            <Button variant="outline" size="sm"><Send className="w-4 h-4" /> WhatsApp</Button>
          </div>
          <Button onClick={handlePesananBaru} className="w-full">Pesanan Baru</Button>
        </div>
      </Modal>
    </div>
  );
}
