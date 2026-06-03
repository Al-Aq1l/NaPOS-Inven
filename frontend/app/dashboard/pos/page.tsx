"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { 
  Search, Plus, Minus, Trash2, CreditCard, QrCode, 
  Banknote, Printer, ShoppingCart, Building2, 
  Camera, RefreshCw, LogOut
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button, Badge, Input, Modal, Card, Toast } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { fetchProducts, fetchBranches, type ApiProduct, type ApiBranch } from "@/lib/dashboard-api";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/db";
import api from "@/lib/api";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

interface Produk {
  id: string;
  name: string;
  price: number;
  category: string;
  sku: string;
  barcode: string;
  image: string;
  imageUrl: string | null;
  stock: number;
  branchStocks: Record<number, number>;
}

interface KeranjangItem extends Produk {
  quantity: number;
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "PD";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function getBranchStocks(item: ApiProduct) {
  return (item.branches ?? []).reduce<Record<number, number>>((stocks, branch) => {
    stocks[branch.id] = branch.pivot?.stock ?? 0;
    return stocks;
  }, {});
}

function parseCashAmount(value: string) {
  const normalized = value.trim().toLowerCase().replace(/\s/g, "").replace(",", ".");
  if (normalized.endsWith("k")) {
    const amount = Number(normalized.slice(0, -1));
    return Number.isFinite(amount) ? Math.round(amount * 1000) : 0;
  }

  return Number(normalized.replace(/\D/g, ""));
}

function mapProdukFromApi(item: ApiProduct, branchId: number | null): Produk {
  const branchStocks = getBranchStocks(item);
  const fallbackStock = Object.values(branchStocks).reduce((sum, stock) => sum + stock, 0);
  return {
    id: String(item.id),
    name: item.name,
    price: Number(item.sell_price),
    category: item.category?.name ?? "Lainnya",
    sku: item.sku ?? `SKU-${item.id}`,
    barcode: item.barcode ?? "",
    image: initialsFromName(item.name),
    imageUrl: item.image_url ?? null,
    stock: branchId ? branchStocks[branchId] ?? 0 : fallbackStock,
    branchStocks,
  };
}

const scannerHints = new Map();
scannerHints.set(DecodeHintType.POSSIBLE_FORMATS, [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
]);
scannerHints.set(DecodeHintType.TRY_HARDER, true);

const cameraConstraints: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1280 },
    height: { ideal: 720 },
  },
  audio: false,
};

export default function POSPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const cashierMode = user?.role === "cashier";
  
  // State Data & UI
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [produk, setProduk] = useState<Produk[]>([]);
  const [cart, setCart] = useState<KeranjangItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State Cabang
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  // State Pelanggan & Bayar
  const [customerName, setCustomerName] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "qris" | "transfer" | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptId, setReceiptId] = useState("ORD-1001");
  const [receiptTime, setReceiptTime] = useState("");
  const [receiptMethod, setReceiptMethod] = useState<"cash" | "qris" | "transfer">("cash");
  const [receiptPrinting, setReceiptPrinting] = useState(false);
  const [cashPaid, setCashPaid] = useState("");
  const [receiptCashPaid, setReceiptCashPaid] = useState(0);
  const [receiptChange, setReceiptChange] = useState(0);
  
  // State Offline-First Sync
  const [isOnline, setIsOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isPendingSyncOrders, setIsPendingSyncOrders] = useState(false);
  
  // State Kamera WebRTC
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanningMessage, setScanningMessage] = useState("Menghubungkan kamera...");
  const [manualScanCode, setManualScanCode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  
  // State Toast Micro-interactions
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info" | "warning">("info");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  // Bunyi beep pemindaian menggunakan Web Audio API
  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1000, ctx.currentTime); // Beep pitch
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => osc.stop(), 150); // Beep duration 150ms
    } catch (e) {
      console.warn("Audio Context tidak didukung:", e);
    }
  };

  // Muat Cabang & Produk (Online / Offline cache)
  const loadData = async (isMounted = true) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Ambil data cabang terlebih dahulu
      const branchData = await fetchBranches();
      if (!isMounted) return;
      setBranches(branchData);
      
      const assignedBranchId = cashierMode && user?.branch_id && branchData.some((branch) => branch.id === user.branch_id)
        ? user.branch_id
        : null;
      const activeBranchId = assignedBranchId || selectedBranchId || branchData[0]?.id || null;
      if (activeBranchId) {
        setSelectedBranchId((prev) => assignedBranchId || prev || activeBranchId);
      }

      // 2. Ambil data produk
      let productData: ApiProduct[] = [];
      try {
        productData = await fetchProducts();
        
        // Simpan salinan cache ke IndexedDB secara mandiri
        if (productData.length > 0 && typeof window !== "undefined") {
          const mappedLocal = productData.map((item) => ({
            id: String(item.id),
            name: item.name,
            price: Number(item.sell_price),
            category: item.category?.name ?? "Lainnya",
            sku: item.sku ?? `SKU-${item.id}`,
            barcode: item.barcode ?? "-",
            imageUrl: item.image_url ?? null,
            stock: activeBranchId ? (getBranchStocks(item)[activeBranchId] ?? 0) : 0,
            branchStocks: getBranchStocks(item),
            rop: item.rop,
          }));
          
          await db.products.clear();
          await db.products.bulkAdd(mappedLocal);
        }
      } catch (fetchErr) {
        console.warn("Koneksi gagal, memuat daftar produk dari cache IndexedDB lokal...", fetchErr);
        const localCache = await db.products.toArray();
        if (localCache.length > 0) {
          setProduk(localCache.map((p) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            category: p.category,
            sku: p.sku,
            barcode: p.barcode,
            image: initialsFromName(p.name),
            imageUrl: p.imageUrl ?? null,
            stock: activeBranchId ? p.branchStocks?.[activeBranchId] ?? 0 : p.stock,
            branchStocks: p.branchStocks ?? {},
          })));
          showToast("Koneksi gagal. Menggunakan data produk ter-cache.", "warning");
          setLoading(false);
          return;
        } else {
          throw new Error("Gagal mengambil data produk online dan tidak ada data cache lokal.");
        }
      }

      if (!isMounted) return;
      setProduk(productData.map((item) => mapProdukFromApi(item, activeBranchId)));
      
      // Hitung antrean offline
      const pendingCount = await db.pendingOrders.where("status").equals("pending").count();
      setIsPendingSyncOrders(pendingCount > 0);

    } catch (err: any) {
      if (!isMounted) return;
      setError(err.message || "Gagal memuat produk.");
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadData(isMounted);

    // Deteksi Status Koneksi Real-time
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      
      const handleOnline = () => {
        setIsOnline(true);
        showToast("Koneksi internet pulih! Mengaktifkan sinkronisasi otomatis...", "success");
        triggerPendingSync();
      };
      
      const handleOffline = () => {
        setIsOnline(false);
        showToast("Koneksi internet terputus. Mengaktifkan mode offline POS.", "warning");
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        isMounted = false;
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedBranchId) return;
    setProduk((prev) => prev.map((item) => ({
      ...item,
      stock: item.branchStocks[selectedBranchId] ?? 0,
    })));
  }, [selectedBranchId]);

  // Sinkronisasi Transaksi Offline Ke Database
  const triggerPendingSync = async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;
    try {
      setSyncing(true);
      const pending = await db.pendingOrders.where("status").equals("pending").toArray();
      if (pending.length === 0) {
        setSyncing(false);
        setIsPendingSyncOrders(false);
        return;
      }

      for (const order of pending) {
        try {
          await api.post("/orders", {
            branch_id: order.branch_id,
            customer_name: order.customer_name,
            payment_method: order.payment_method,
            items: order.items.map((i) => ({
              product_id: i.product_id,
              quantity: i.quantity,
            })),
          });
          // Ubah status lokal menjadi tersinkronisasi
          await db.pendingOrders.update(order.id!, { status: "synced" });
        } catch (err: any) {
          console.error("Gagal mengirim order offline:", err);
          if (err.response && err.response.status === 422) {
            // Tandai gagal jika ada error validasi agar tidak memblokir antrean
            await db.pendingOrders.update(order.id!, { 
              status: "failed", 
              error_message: JSON.stringify(err.response.data.errors) 
            });
          } else {
            // Hentikan sementara jika murni error koneksi agar bisa diulang nanti
            break;
          }
        }
      }

      const remaining = await db.pendingOrders.where("status").equals("pending").count();
      setIsPendingSyncOrders(remaining > 0);
      
      if (remaining === 0) {
        showToast("Semua transaksi offline berhasil disinkronkan ke server!", "success");
        loadData(true); // Muat ulang stok terbaru pasca sinkronisasi
      }
    } catch (err) {
      console.error("Error offline sync:", err);
    } finally {
      setSyncing(false);
    }
  };

  // Menangani Kamera Barcode Scanner WebRTC
  const startCamera = async () => {
    setScanningMessage("Membuka kamera...");
    try {
      const videoElement = videoRef.current;
      if (!videoElement) {
        setScanningMessage("Elemen video belum siap. Coba buka pemindai lagi.");
        return;
      }

      const reader = new BrowserMultiFormatReader(scannerHints, {
        delayBetweenScanAttempts: 100,
        delayBetweenScanSuccess: 500,
      });
      scannerControlsRef.current = await reader.decodeFromConstraints(
        cameraConstraints,
        videoElement,
        (result) => {
          if (!result) return;

          handleScannedCode(result.getText());
        }
      );

      const stream = videoElement.srcObject instanceof MediaStream ? videoElement.srcObject : null;
      setCameraStream(stream);
      setScanningMessage("Arahkan QR atau barcode produk ke kotak pemindai. QR biasanya lebih cepat terbaca dari layar HP.");

    } catch (err) {
      console.error("Gagal akses kamera:", err);
      setScanningMessage("Akses kamera ditolak atau tidak ditemukan.");
      showToast("Gagal memuat kamera perangkat.", "error");
    }
  };

  const closeCamera = () => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraOpen(false);
  };

  const handleScannedCode = (rawCode: string) => {
    const scannedCode = rawCode.trim();
    if (!scannedCode) return;

    const normalizedCode = scannedCode.toLowerCase();
    const scannedProduct = produk.find((item) => {
      return item.barcode.toLowerCase() === normalizedCode || item.sku.toLowerCase() === normalizedCode;
    });

    scannerControlsRef.current?.stop();
    playBeep();

    if (!scannedProduct) {
      setScanningMessage(`Kode ${scannedCode} tidak terdaftar di produk.`);
      showToast(`Kode ${scannedCode} tidak terdaftar.`, "warning");
      return;
    }

    addToCart(scannedProduct);
    showToast(`Berhasil memindai: ${scannedProduct.name}`, "success");
    closeCamera();
  };

  useEffect(() => {
    if (cameraOpen) {
      startCamera();
    } else {
      closeCamera();
    }
    return () => { closeCamera(); };
  }, [cameraOpen]);

  // POS Logic
  const kategori = useMemo(() => ["Semua", ...new Set(produk.map((p) => p.category))], [produk]);

  const filtered = useMemo(() => {
    return produk.filter((p) => {
      const matchCat = category === "Semua" || p.category === category;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.sku.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [produk, search, category]);

  const addToCart = (product: Produk) => {
    const currentQty = cart.find((item) => item.id === product.id)?.quantity ?? 0;
    if (currentQty >= product.stock) {
      showToast(`Stok ${product.name} di cabang ini tidak cukup.`, "warning");
      return;
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.id === product.id);
      if (existing) return prev.map((c) => (c.id === product.id ? { ...c, quantity: c.quantity + 1 } : c));
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((c) => {
          if (c.id !== id) return c;
          const availableStock = produk.find((p) => p.id === id)?.stock ?? c.stock;
          return { ...c, quantity: Math.min(availableStock, Math.max(0, c.quantity + delta)) };
        })
        .filter((c) => c.quantity > 0);
    });
  };

  const removeItem = (id: string) => setCart((prev) => prev.filter((c) => c.id !== id));

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const tax = Math.round(subtotal * 0.11);
  const total = subtotal + tax;
  const itemCount = cart.reduce((sum, c) => sum + c.quantity, 0);
  const activeBranchName = branches.find((branch) => branch.id === selectedBranchId)?.name ?? "-";
  const cashierBranchMissing = cashierMode && !user?.branch_id;
  const cashPaidAmount = parseCashAmount(cashPaid);
  const cashChange = Math.max(0, cashPaidAmount - total);
  const isCashEnough = cashPaidAmount >= total;
  const cashShortcuts = [10000, 20000, 50000, 100000];
  const paymentMethodLabels = {
    cash: "Tunai",
    qris: "QRIS",
    transfer: "Debit",
  };

  const handleBranchChange = (nextBranchId: number) => {
    if (nextBranchId === selectedBranchId) return;

    if (cart.length > 0) {
      const confirmed = window.confirm("Mengganti cabang akan mengosongkan keranjang. Lanjutkan?");
      if (!confirmed) return;
      setCart([]);
      setCashPaid("");
      setCustomerName("");
    }

    setSelectedBranchId(nextBranchId);
    showToast("Cabang aktif diganti. Stok produk disesuaikan.", "info");
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const openPaymentModal = () => {
    setSelectedPaymentMethod(null);
    setPaymentOpen(true);
  };

  const closePaymentModal = () => {
    setSelectedPaymentMethod(null);
    setPaymentOpen(false);
  };

  // Proses Checkout Transaksi (Online / Offline Mode)
  const executePayment = async (method: "cash" | "qris" | "transfer") => {
    if (cashierBranchMissing) {
      showToast("Cabang kerja kasir belum diatur owner.", "error");
      return;
    }
    if (!selectedBranchId) {
      showToast("Harap pilih cabang aktif terlebih dahulu.", "error");
      return;
    }
    if (cart.length === 0) return;
    if (method === "cash" && !isCashEnough) {
      showToast("Nominal uang tunai masih kurang.", "error");
      return;
    }

    closePaymentModal();
    setLoading(true);

    const generatedId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const nowTime = new Date().toLocaleTimeString("id-ID");
    const paidAmount = method === "cash" ? cashPaidAmount : total;
    const changeAmount = method === "cash" ? paidAmount - total : 0;
    setReceiptMethod(method);
    setReceiptCashPaid(paidAmount);
    setReceiptChange(changeAmount);

    if (navigator.onLine) {
      // PROSES ONLINE: Langsung POST ke API Laravel
      try {
        await api.post("/orders", {
          branch_id: selectedBranchId,
          customer_name: customerName || "Pelanggan Umum",
          payment_method: method,
          items: cart.map((i) => ({
            product_id: Number(i.id),
            quantity: i.quantity,
          })),
        });

        playBeep();
        setReceiptId(generatedId);
        setReceiptTime(nowTime);
        setReceiptOpen(true);
        showToast("Transaksi berhasil diproses online!", "success");
        await loadData(true);

      } catch (err: any) {
        console.error("Gagal checkout online:", err);
        showToast("Gagal menyimpan transaksi online. Mengalihkan ke antrean offline.", "warning");
        await saveOfflineOrder(method, generatedId, nowTime);
      } finally {
        setLoading(false);
      }
    } else {
      // PROSES OFFLINE: Simpan ke IndexedDB lokal
      await saveOfflineOrder(method, generatedId, nowTime);
      setLoading(false);
    }
  };

  const saveOfflineOrder = async (method: "cash" | "qris" | "transfer", localId: string, localTime: string) => {
    try {
      const offlineOrder = {
        uuid: `uuid-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        branch_id: selectedBranchId!,
        customer_name: customerName || "Pelanggan Umum",
        payment_method: method,
        items: cart.map((i) => ({
          product_id: Number(i.id),
          quantity: i.quantity,
          name: i.name,
          price: i.price,
        })),
        total_amount: total,
        created_at: new Date().toISOString(),
        status: "pending" as const,
      };

      await db.pendingOrders.add(offlineOrder);
      
      // Update stok lokal sementara secara visual di layar
      setProduk((prev) => {
        return prev.map((p) => {
          const cartItem = cart.find((c) => c.id === p.id);
          if (cartItem) {
            const nextStock = Math.max(0, p.stock - cartItem.quantity);
            const nextBranchStocks = selectedBranchId
              ? { ...p.branchStocks, [selectedBranchId]: nextStock }
              : p.branchStocks;
            db.products.update(p.id, { stock: nextStock, branchStocks: nextBranchStocks });
            return { ...p, stock: nextStock, branchStocks: nextBranchStocks };
          }
          return p;
        });
      });

      playBeep();
      setReceiptId(`${localId} (Offline)`);
      setReceiptTime(localTime);
      setIsPendingSyncOrders(true);
      setReceiptOpen(true);
      showToast("Internet Offline. Transaksi disimpan di perangkat kasir.", "warning");

    } catch (dbErr) {
      console.error("Gagal simpan lokal:", dbErr);
      showToast("Kesalahan kritis: Gagal menyimpan data di perangkat.", "error");
    }
  };

  const handlePrintReceipt = async () => {
    if (cart.length === 0 || receiptPrinting) return;

    setReceiptPrinting(true);

    try {
      await api.post("/receipts/print", {
        receipt_id: receiptId,
        receipt_time: receiptTime || "-",
        branch_name: activeBranchName,
        cashier_name: user?.name ?? "-",
        customer_name: customerName || "Pelanggan Umum",
        payment_method_label: paymentMethodLabels[receiptMethod],
        cash_paid: receiptMethod === "cash" ? receiptCashPaid : null,
        change: receiptMethod === "cash" ? receiptChange : null,
        subtotal,
        tax,
        total,
        is_offline: receiptId.includes("Offline"),
        items: cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.quantity * item.price,
        })),
      });

      showToast("Struk dikirim ke printer ESC/POS.", "success");
    } catch (err: unknown) {
      console.error("Gagal print ESC/POS:", err);
      const message = typeof err === "object" && err !== null && "response" in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      showToast(message ?? "Gagal mencetak ESC/POS. Cek konfigurasi printer.", "error");
    } finally {
      setReceiptPrinting(false);
    }
  };

  const handleNewOrder = () => {
    setReceiptOpen(false);
    setCart([]);
    setCustomerName("");
    setCashPaid("");
    setReceiptCashPaid(0);
    setReceiptChange(0);
  };

  return (
    <div className={cn("flex relative overflow-hidden", cashierMode ? "h-screen" : "h-[calc(100vh-4rem)] -m-4 lg:-m-6")}>
      <div className="receipt-print-area hidden print:block" aria-hidden="true">
        <div className="receipt-paper">
          <div className="receipt-center">
            <p className="receipt-title">NAPS</p>
            <p>Smart Inventory & POS</p>
            <p>Cabang: {activeBranchName}</p>
          </div>

          <div className="receipt-line" />

          <div className="receipt-row">
            <span>No</span>
            <span>{receiptId}</span>
          </div>
          <div className="receipt-row">
            <span>Waktu</span>
            <span>{receiptTime || "-"}</span>
          </div>
          <div className="receipt-row">
            <span>Kasir</span>
            <span>{user?.name ?? "-"}</span>
          </div>
          <div className="receipt-row">
            <span>Pelanggan</span>
            <span>{customerName || "Pelanggan Umum"}</span>
          </div>
          <div className="receipt-row">
            <span>Bayar</span>
            <span>{paymentMethodLabels[receiptMethod]}</span>
          </div>
          {receiptMethod === "cash" && (
            <>
              <div className="receipt-row">
                <span>Diterima</span>
                <span>{formatIDR(receiptCashPaid)}</span>
              </div>
              <div className="receipt-row">
                <span>Kembali</span>
                <span>{formatIDR(receiptChange)}</span>
              </div>
            </>
          )}

          <div className="receipt-line" />

          {cart.map((item) => (
            <div key={item.id} className="receipt-item">
              <p>{item.name}</p>
              <div className="receipt-row">
                <span>{item.quantity} x {formatIDR(item.price)}</span>
                <span>{formatIDR(item.quantity * item.price)}</span>
              </div>
            </div>
          ))}

          <div className="receipt-line" />

          <div className="receipt-row">
            <span>Subtotal</span>
            <span>{formatIDR(subtotal)}</span>
          </div>
          <div className="receipt-row">
            <span>PPN 11%</span>
            <span>{formatIDR(tax)}</span>
          </div>
          <div className="receipt-row receipt-total">
            <span>Total</span>
            <span>{formatIDR(total)}</span>
          </div>

          <div className="receipt-line" />

          <div className="receipt-center">
            <p>Terima kasih</p>
            <p>{receiptId.includes("Offline") ? "Transaksi tersimpan lokal" : "Transaksi tersimpan"}</p>
          </div>
        </div>
      </div>
      
      {/* Toast Notifikasi */}
      <Toast message={toastMsg} type={toastType === "warning" ? "info" : toastType} visible={toastVisible} />

      {/* Bagian Utama POS */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--border)] bg-[var(--surface-raised)]/20">
        
        {/* Header POS */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)] space-y-3 shadow-[var(--shadow-xs)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            
            {/* Pemilihan Cabang */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--brand-600)]" />
              {cashierMode ? (
                <div className={cn(
                  "flex h-9 items-center rounded-lg border px-3 text-xs font-semibold",
                  cashierBranchMissing
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-primary)]"
                )}>
                  Cabang: {cashierBranchMissing ? "Belum diatur owner" : activeBranchName}
                </div>
              ) : (
                <select
                  value={selectedBranchId || ""}
                  onChange={(e) => handleBranchChange(Number(e.target.value))}
                  className="h-9 px-2 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg text-xs font-semibold text-[var(--text-primary)] cursor-pointer"
                >
                  {branches.length === 0 && <option>Memuat cabang...</option>}
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      Cabang: {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Status Koneksi & Sinkronisasi */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isPendingSyncOrders && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 border-amber-300 text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:border-amber-700/50 dark:text-amber-300"
                  icon={<RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />} 
                  onClick={triggerPendingSync}
                  loading={syncing}
                >
                  Sinkron Transaksi ({syncing ? "..." : "Offline"})
                </Button>
              )}
              <Badge variant={isOnline ? "success" : "danger"} dot pulse={!isOnline}>
                {isOnline ? "Server Online" : "Mode Offline"}
              </Badge>
              {cashierMode && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex h-8 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger-50)] hover:text-[var(--danger-600)]"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Cari produk atau SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                rightIcon={
                  <button 
                    onClick={() => setCameraOpen(true)} 
                    className="p-1 hover:bg-[var(--surface-raised)] rounded text-[var(--brand-600)] cursor-pointer transition-colors"
                    title="Scan Barcode via Kamera WebRTC"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                }
              />
            </div>
          </div>

          {!cashierMode && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {kategori.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border",
                    category === cat
                      ? "bg-[var(--brand-600)] text-white border-transparent shadow-[var(--shadow-sm)]"
                      : "bg-[var(--surface-raised)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--slate-150)] dark:hover:bg-[var(--slate-800)]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Daftar Produk */}
        <div className={cn("flex-1 min-h-0", cashierMode ? "flex" : "overflow-y-auto p-4 lg:p-6")}>
          {cashierMode && (
            <aside className="hidden w-56 flex-shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] p-4 sm:flex">
              <p className="mb-4 px-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                Kategori
              </p>
              <div className="space-y-2 overflow-y-auto">
                {kategori.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors",
                      category === cat
                        ? "bg-[var(--brand-600)] text-white shadow-[var(--shadow-sm)]"
                        : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    <span className="min-w-0 truncate">{cat}</span>
                    <span className={cn("rounded-full px-2 py-1 text-xs", category === cat ? "bg-white/20 text-white" : "bg-[var(--surface-raised)] text-[var(--text-tertiary)]")}>
                      {cat === "Semua" ? produk.length : produk.filter((item) => item.category === cat).length}
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          )}

          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {cashierMode && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-1 sm:hidden scrollbar-hide">
                {kategori.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer border",
                      category === cat
                        ? "bg-[var(--brand-600)] text-white border-transparent shadow-[var(--shadow-sm)]"
                        : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-raised)]"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <Card>
                <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[var(--brand-600)]" />
                  Memuat data produk...
                </p>
              </Card>
            )}
            {error && (
              <Card className="border-red-300 bg-red-50 text-red-700 dark:bg-red-950/20 dark:border-red-900/50 dark:text-red-300">
                <p className="text-sm font-medium">{error}</p>
              </Card>
            )}

            {!loading && !error && (
              <div className={cn(
                "grid gap-4",
                cashierMode
                  ? "grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                  : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5"
              )}>
                {filtered.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group flex flex-col overflow-hidden bg-[var(--surface)] border border-[var(--border)] rounded-xl hover:border-[var(--brand-300)] transition-colors duration-150 cursor-pointer active:scale-[0.99] text-left"
                  >
                    <div className="relative aspect-square w-full bg-[var(--surface-raised)]">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className={cn("flex h-full w-full items-center justify-center font-black text-[var(--brand-700)] dark:text-[var(--brand-300)]", cashierMode ? "text-4xl" : "text-3xl")}>
                          {product.image}
                        </div>
                      )}
                      <Badge variant={product.stock <= 0 ? "danger" : product.stock < 10 ? "warning" : "success"} size="sm" className="absolute right-2 top-2 py-0 text-xs">
                        {product.stock <= 0 ? "Habis" : product.stock}
                      </Badge>
                    </div>

                    <div className={cn("flex w-full flex-col", cashierMode ? "min-h-[7rem] p-3.5" : "min-h-[6.5rem] p-3")}>
                      <p className={cn("font-semibold text-[var(--text-primary)] leading-tight line-clamp-2", cashierMode ? "min-h-[2.5rem] text-sm" : "min-h-[2.25rem] text-sm")}>
                        {product.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--text-tertiary)] font-mono">
                        {product.sku}
                      </p>
                      <p className={cn("mt-auto font-bold text-[var(--brand-600)]", cashierMode ? "text-base" : "text-sm")}>
                        {formatIDR(product.price)}
                      </p>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="col-span-full py-12 text-center text-[var(--text-tertiary)] bg-[var(--surface)] border border-dashed border-[var(--border)] rounded-2xl">
                    Tidak ada produk ditemukan
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Keranjang Belanja */}
      <div className="hidden md:flex w-80 lg:w-96 flex-col bg-[var(--surface)] border-l border-[var(--border)] shadow-[var(--shadow-sm)]">
        <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
          <h2 className="font-bold text-[var(--text-primary)] flex items-center gap-2 text-sm lg:text-base">
            <ShoppingCart className="w-5 h-5 text-[var(--brand-600)]" /> Keranjang Belanja
          </h2>
          {cart.length > 0 && <Badge variant="brand">{itemCount} unit</Badge>}
        </div>

        {/* List Item Keranjang */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="p-4 bg-[var(--surface-raised)] rounded-2xl mb-3">
                <ShoppingCart className="w-10 h-10 text-[var(--text-tertiary)] opacity-40" />
              </div>
              <p className="text-sm font-semibold text-[var(--text-secondary)]">Keranjang Kosong</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1 max-w-[15rem] mx-auto">
                Silakan pilih produk di sebelah kiri untuk menambah item penjualan.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-[var(--surface-raised)]/70 hover:bg-[var(--surface-raised)] border border-[var(--border)]/70 rounded-xl transition-all duration-150">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-9 w-9 flex-shrink-0 rounded-lg object-cover ring-1 ring-[var(--border)]" />
                  ) : (
                    <span className="text-xs w-9 h-9 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center font-bold text-[var(--brand-700)] dark:text-[var(--brand-300)] flex-shrink-0">
                      {item.image}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{item.name}</p>
                    <p className="text-xs font-bold text-[var(--brand-600)] mt-0.5">{formatIDR(item.price)}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button 
                      onClick={() => updateQuantity(item.id, -1)} 
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--slate-100)] dark:hover:bg-[var(--slate-800)] transition-colors cursor-pointer"
                    >
                      <Minus className="w-3 h-3 text-[var(--text-secondary)]" />
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-[var(--text-primary)]">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, 1)} 
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--slate-100)] dark:hover:bg-[var(--slate-800)] transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-[var(--text-secondary)]" />
                    </button>
                    <button 
                      onClick={() => removeItem(item.id)} 
                      className="w-6 h-6 flex items-center justify-center rounded-lg text-[var(--danger-500)] hover:bg-[var(--danger-50)] dark:hover:bg-[var(--danger-950)]/30 transition-colors cursor-pointer ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ringkasan Biaya */}
        {cart.length > 0 && (
          <div className="border-t border-[var(--border)] p-4 bg-[var(--surface-raised)]/35 space-y-4 shadow-[var(--shadow-lg)]">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Subtotal</span>
                <span>{formatIDR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Pajak PPN (11%)</span>
                <span>{formatIDR(tax)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-[var(--text-primary)] pt-3 border-t border-[var(--border)]">
                <span>Total Bayar</span>
                <span>{formatIDR(total)}</span>
              </div>
            </div>
            <Button onClick={openPaymentModal} className="w-full h-11 text-sm font-bold shadow-md hover:shadow-lg" size="lg">
              <CreditCard className="w-4 h-4" /> Proses Pembayaran
            </Button>
          </div>
        )}
      </div>

      {/* MODAL KAMERA BARCODE SCANNER (WebRTC) */}
      <Modal open={cameraOpen} onClose={() => setCameraOpen(false)} title="Pemindai Barcode Kamera" size="md">
        <div className="space-y-4">
          <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-inner border-2 border-[var(--border)]">
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn("w-full h-full object-cover scale-x-[-1]", !cameraStream && "opacity-0")}
            />
            {!cameraStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-[var(--text-secondary)]">
                <RefreshCw className="w-8 h-8 animate-spin text-[var(--brand-600)] mb-3" />
                <p className="text-xs font-semibold">{scanningMessage}</p>
              </div>
            )}
            
            {/* Animasi Garis Laser Scan Premium */}
            {cameraStream && (
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 border-2 border-dashed border-[var(--brand-500)] rounded-xl relative opacity-80">
                    <div className="absolute w-full h-0.5 bg-[var(--danger-500)] top-1/2 left-0 shadow-[0_0_8px_var(--danger-500)] animate-pulse" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-[var(--text-secondary)] font-medium leading-relaxed">
              {scanningMessage}
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Input manual barcode/SKU jika kamera sulit fokus..."
              value={manualScanCode}
              onChange={(e) => setManualScanCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleScannedCode(manualScanCode);
              }}
              className="h-9 text-xs"
            />
            <Button
              variant="outline"
              className="h-9 text-xs"
              onClick={() => handleScannedCode(manualScanCode)}
            >
              Cek
            </Button>
          </div>
          <Button variant="outline" onClick={() => setCameraOpen(false)} className="w-full text-xs h-9">
            Tutup Pemindai
          </Button>
        </div>
      </Modal>

      {/* MODAL PEMBAYARAN */}
      <Modal open={paymentOpen} onClose={closePaymentModal} title="Pilih Metode Pembayaran" size="sm">
        <div className="space-y-5">
          <div className="text-center p-4 bg-[var(--surface-raised)] rounded-2xl border border-[var(--border)]">
            <p className="text-xs font-medium text-[var(--text-secondary)]">Tagihan Pembayaran</p>
            <p className="text-2xl font-black text-[var(--text-primary)] mt-1.5">{formatIDR(total)}</p>
          </div>
          
          <Input 
            label="Nama Pelanggan (Opsional)" 
            placeholder="Ketik nama pelanggan..." 
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

          <div className="space-y-3">
            <p className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Metode Pembayaran</p>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { icon: Banknote, label: "Tunai", val: "cash" as const, color: "hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20" },
                { icon: QrCode, label: "QRIS", val: "qris" as const, color: "hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20" },
                { icon: CreditCard, label: "Debit", val: "transfer" as const, color: "hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/20" },
              ].map(({ icon: Icon, label, val, color }) => (
                <button
                  key={label}
                  onClick={() => (val === "cash" ? setSelectedPaymentMethod("cash") : executePayment(val))}
                  className={cn(
                    "flex min-h-24 flex-col items-center justify-center gap-2.5 rounded-xl border p-3 text-center transition-all duration-200 active:scale-95 cursor-pointer",
                    selectedPaymentMethod === val
                      ? "border-[var(--brand-500)] bg-[var(--brand-50)] text-[var(--brand-700)] dark:bg-[var(--brand-950)] dark:text-[var(--brand-300)]"
                      : "border-[var(--border)] text-[var(--text-secondary)]",
                    color
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-black text-[var(--text-primary)]">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {selectedPaymentMethod === "cash" && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)]/45 p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => setCashPaid(String(total))}>
                  Uang Pas
                </Button>
                {cashShortcuts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => setCashPaid(String(amount))}
                  >
                    {amount / 1000}k
                  </Button>
                ))}
              </div>

              <Input
                label="Uang Diterima"
                placeholder="Contoh: 15000 atau 15k"
                value={cashPaid}
                onChange={(e) => setCashPaid(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3">
                  <p className="text-[var(--text-secondary)]">Kurang</p>
                  <p className={cn("mt-1 font-black", isCashEnough ? "text-[var(--success-600)]" : "text-[var(--danger-500)]")}>
                    {isCashEnough ? formatIDR(0) : formatIDR(total - cashPaidAmount)}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--surface)] border border-[var(--border)] p-3">
                  <p className="text-[var(--text-secondary)]">Kembalian</p>
                  <p className="mt-1 font-black text-[var(--text-primary)]">{formatIDR(cashChange)}</p>
                </div>
              </div>

              <Button
                className="w-full h-10 text-xs font-bold"
                onClick={() => executePayment("cash")}
                disabled={!isCashEnough}
              >
                <Banknote className="w-4 h-4" /> Bayar Tunai
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL STRUK SUKSES */}
      <Modal open={receiptOpen} onClose={handleNewOrder} title="Struk Pembayaran" size="sm">
        <div className="space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3.5 dark:bg-green-900/30 dark:text-green-400">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Pembayaran Sukses</h3>
            <p className="text-2xl font-black text-[var(--brand-600)] mt-1">{formatIDR(total)}</p>
          </div>
          
          <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--surface-raised)]/50 space-y-2.5 font-mono text-[11px] leading-relaxed">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Nomor Pesanan</span>
              <span className="font-bold text-[var(--text-primary)]">{receiptId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Kuantitas Item</span>
              <span className="font-bold text-[var(--text-primary)]">{itemCount} unit</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Waktu Transaksi</span>
              <span className="font-bold text-[var(--text-primary)]">{receiptTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Status Sync</span>
              <span className="font-bold">
                {receiptId.includes("Offline") ? (
                  <Badge variant="warning" size="sm" className="text-[9px] py-0 h-4">Antrean Lokal</Badge>
                ) : (
                  <Badge variant="success" size="sm" className="text-[9px] py-0 h-4">Tersimpan Awan</Badge>
                )}
              </span>
            </div>
            {receiptMethod === "cash" && (
              <>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Uang Diterima</span>
                  <span className="font-bold text-[var(--text-primary)]">{formatIDR(receiptCashPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Kembalian</span>
                  <span className="font-bold text-[var(--text-primary)]">{formatIDR(receiptChange)}</span>
                </div>
              </>
            )}
          </div>
          
          <Button variant="outline" size="sm" icon={<Printer className="w-3.5 h-3.5" />} className="w-full h-9 text-xs" onClick={handlePrintReceipt} disabled={receiptPrinting}>
            {receiptPrinting ? "Mencetak..." : "Cetak Struk"}
          </Button>
          <Button onClick={handleNewOrder} className="w-full h-10 text-xs font-bold shadow-sm">
            Mulai Pesanan Baru
          </Button>
        </div>
      </Modal>
    </div>
  );
}
