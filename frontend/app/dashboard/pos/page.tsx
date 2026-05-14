"use client";

import React, { useState, useMemo } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, QrCode, Banknote, X, Send, Printer, ShoppingCart } from "lucide-react";
import { Button, Badge, Input, Modal, ConnectionStatus } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Product {
  id: string; name: string; price: number; category: string; sku: string; image: string; stock: number;
}

interface CartItem extends Product { quantity: number; }

const CATEGORIES = ["All", "Beverages", "Snacks", "Rice & Noodles", "Dairy", "Groceries", "Household"];

const PRODUCTS: Product[] = [
  { id: "p1", name: "Kopi Arabica 250g", price: 85000, category: "Beverages", sku: "KOP-001", image: "☕", stock: 24 },
  { id: "p2", name: "Teh Celup Box 25s", price: 18500, category: "Beverages", sku: "TEH-001", image: "🍵", stock: 42 },
  { id: "p3", name: "Susu UHT 1L", price: 16000, category: "Dairy", sku: "SUS-001", image: "🥛", stock: 36 },
  { id: "p4", name: "Gula Pasir 1kg", price: 14500, category: "Groceries", sku: "GUL-001", image: "🍬", stock: 58 },
  { id: "p5", name: "Mie Instan Box", price: 95000, category: "Rice & Noodles", sku: "MIE-001", image: "🍜", stock: 120 },
  { id: "p6", name: "Beras Premium 5kg", price: 68000, category: "Rice & Noodles", sku: "BRS-001", image: "🍚", stock: 15 },
  { id: "p7", name: "Keripik Singkong", price: 12000, category: "Snacks", sku: "KRP-001", image: "🥔", stock: 65 },
  { id: "p8", name: "Biskuit Kaleng", price: 45000, category: "Snacks", sku: "BSK-001", image: "🍪", stock: 28 },
  { id: "p9", name: "Sabun Cuci 1L", price: 28000, category: "Household", sku: "SBN-001", image: "🧴", stock: 33 },
  { id: "p10", name: "Minyak Goreng 2L", price: 32000, category: "Groceries", sku: "MYK-001", image: "🫗", stock: 44 },
  { id: "p11", name: "Air Mineral 600ml", price: 4000, category: "Beverages", sku: "AIR-001", image: "💧", stock: 200 },
  { id: "p12", name: "Cokelat Bar", price: 15000, category: "Snacks", sku: "CKL-001", image: "🍫", stock: 55 },
];

export default function POSPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const filtered = useMemo(() =>
    PRODUCTS.filter((p) =>
      (category === "All" || p.category === category) &&
      (p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()))
    ), [search, category]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id);
      if (existing) return prev.map((c) => c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => prev.map((c) => c.id === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter((c) => c.quantity > 0));
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;
  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handlePayment = () => {
    setPaymentOpen(false);
    setReceiptOpen(true);
  };

  const handleNewOrder = () => {
    setReceiptOpen(false);
    setCart([]);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4 lg:-m-6">
      {/* Left: Products */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border)]">
        {/* Search & Categories */}
        <div className="p-4 border-b border-[var(--border)] space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Search products or scan barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                rightIcon={<button className="p-1 hover:bg-[var(--surface-raised)] rounded cursor-pointer"><QrCode className="w-4 h-4" /></button>}
              />
            </div>
            <ConnectionStatus isOnline={true} className="hidden sm:flex" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer",
                  category === cat
                    ? "bg-[var(--brand-600)] text-white"
                    : "bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--slate-200)] dark:hover:bg-[var(--slate-700)]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex flex-col items-center p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--brand-300)] hover:shadow-[var(--shadow-sm)] transition-all duration-150 cursor-pointer active:scale-[0.97] text-left"
              >
                <span className="text-3xl mb-2">{product.image}</span>
                <p className="text-sm font-medium text-[var(--text-primary)] text-center leading-tight line-clamp-2 w-full">{product.name}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-1">{product.sku}</p>
                <p className="text-sm font-bold text-[var(--brand-600)] mt-1.5">{formatIDR(product.price)}</p>
                <Badge variant={product.stock < 10 ? "warning" : "success"} size="sm" className="mt-1.5">
                  Stock: {product.stock}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Cart */}
      <div className="hidden md:flex w-80 lg:w-96 flex-col bg-[var(--surface)]">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" /> Cart
            </h2>
            {cart.length > 0 && <Badge variant="brand">{itemCount} items</Badge>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="w-12 h-12 text-[var(--text-tertiary)] mb-3 opacity-30" />
              <p className="text-sm text-[var(--text-tertiary)]">Cart is empty</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">Tap products to add them</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 bg-[var(--surface-raised)] rounded-lg">
                  <span className="text-xl flex-shrink-0">{item.image}</span>
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

        {/* Cart Summary */}
        {cart.length > 0 && (
          <div className="border-t border-[var(--border)] p-4 space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Subtotal</span><span>{formatIDR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Tax (11%)</span><span>{formatIDR(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border)]">
                <span>Total</span><span>{formatIDR(total)}</span>
              </div>
            </div>
            <Button onClick={() => setPaymentOpen(true)} className="w-full" size="lg">
              <CreditCard className="w-5 h-5" /> Charge {formatIDR(total)}
            </Button>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Payment" size="sm">
        <div className="space-y-4">
          <div className="text-center p-4 bg-[var(--surface-raised)] rounded-lg">
            <p className="text-sm text-[var(--text-secondary)]">Total Amount</p>
            <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">{formatIDR(total)}</p>
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">Payment Method</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: Banknote, label: "Cash" },
              { icon: CreditCard, label: "Card" },
              { icon: QrCode, label: "QRIS" },
            ].map(({ icon: Icon, label }) => (
              <button key={label} onClick={handlePayment}
                className="flex flex-col items-center gap-2 p-4 border border-[var(--border)] rounded-xl hover:border-[var(--brand-300)] hover:bg-[var(--brand-50)] transition-all cursor-pointer dark:hover:bg-[var(--brand-950)]">
                <Icon className="w-6 h-6 text-[var(--text-secondary)]" />
                <span className="text-xs font-medium text-[var(--text-primary)]">{label}</span>
              </button>
            ))}
          </div>
          <Input label="Customer Name (optional)" placeholder="Walk-in Customer" />
        </div>
      </Modal>

      {/* Receipt Modal */}
      <Modal open={receiptOpen} onClose={handleNewOrder} title="Receipt" size="sm">
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3 dark:bg-green-900/30 dark:text-green-400">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Payment Successful!</h3>
            <p className="text-2xl font-bold text-[var(--brand-600)] mt-1">{formatIDR(total)}</p>
          </div>
          <div className="border border-[var(--border)] rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Order</span><span className="font-medium text-[var(--text-primary)]">#ORD-{String(Date.now()).slice(-4)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Items</span><span className="font-medium text-[var(--text-primary)]">{itemCount}</span></div>
            <div className="flex justify-between text-sm"><span className="text-[var(--text-secondary)]">Time</span><span className="font-medium text-[var(--text-primary)]">{new Date().toLocaleTimeString("id-ID")}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm"><Printer className="w-4 h-4" /> Print</Button>
            <Button variant="outline" size="sm"><Send className="w-4 h-4" /> WhatsApp</Button>
          </div>
          <Button onClick={handleNewOrder} className="w-full">New Order</Button>
        </div>
      </Modal>
    </div>
  );
}
