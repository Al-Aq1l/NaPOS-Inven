"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { 
  ClipboardList, 
  Camera, 
  Search, 
  Building2, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  Trash2, 
  Scan
} from "lucide-react";
import { Card, Badge, Button, Modal, Input, Toast, StatCard } from "@/components/ui";
import { formatIDR } from "@/lib/constants";
import { fetchBranches, fetchProducts, type ApiBranch, type ApiProduct } from "@/lib/dashboard-api";
import api from "@/lib/api";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

type OpnameItemInput = {
  productId: number;
  productName: string;
  sku: string;
  barcode: string;
  costPrice: number;
  systemQty: number;
  physicalQty: string; // string so it can be blank/edited
};

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

export default function StockOpnamePage() {
  const [branches, setBranches] = useState<ApiBranch[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notes, setNotes] = useState("");
  
  // Opname Items map (productId -> input state)
  const [opnameItems, setOpnameItems] = useState<Record<number, OpnameItemInput>>({});

  // Scanner modal states
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [scanningMessage, setScanningMessage] = useState("");
  const [manualScanCode, setManualScanCode] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);

  // Toast notifications
  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error" | "info" | "warning">("info");
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = (msg: string, type: "success" | "error" | "info" | "warning" = "info") => {
    setToastMsg(msg);
    setToastType(type);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 4000);
  };

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.warn("AudioContext failed:", e);
    }
  };

  // Load branches and products
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [bData, pData] = await Promise.all([fetchBranches(), fetchProducts()]);
      setBranches(bData);
      setProducts(pData);
      
      // Auto select first branch if available
      if (bData.length > 0) {
        setSelectedBranchId(String(bData[0].id));
      }
    } catch {
      showToast("Gagal memuat data awal.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // When branch or products load, populate our opnameItems dictionary
  useEffect(() => {
    if (!selectedBranchId || products.length === 0) {
      setOpnameItems({});
      return;
    }

    const bId = parseInt(selectedBranchId);
    const initialItems: Record<number, OpnameItemInput> = {};

    products.forEach((p) => {
      // Find stock in this branch
      const branchPivot = p.branches?.find((b) => b.id === bId);
      const systemStock = branchPivot?.pivot?.stock ?? 0;
      
      initialItems[p.id] = {
        productId: p.id,
        productName: p.name,
        sku: p.sku || `SKU-${p.id}`,
        barcode: p.barcode || "",
        costPrice: parseFloat(p.cost_price || "0"),
        systemQty: systemStock,
        physicalQty: "", // start unedited
      };
    });

    setOpnameItems(initialItems);
  }, [selectedBranchId, products]);

  // Calculations for stats
  const itemsArray = useMemo(() => Object.values(opnameItems), [opnameItems]);

  const filteredItems = useMemo(() => {
    return itemsArray.filter(
      (item) =>
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [itemsArray, searchQuery]);

  // Stats: items counted, total variance, value impact
  const stats = useMemo(() => {
    let counted = 0;
    let totalVar = 0;
    let totalValueImpact = 0;

    itemsArray.forEach((item) => {
      if (item.physicalQty !== "") {
        const phys = parseInt(item.physicalQty) || 0;
        const diff = phys - item.systemQty;
        counted++;
        totalVar += diff;
        totalValueImpact += diff * item.costPrice;
      }
    });

    return { counted, totalVar, totalValueImpact };
  }, [itemsArray]);

  // Update physical qty input
  const updatePhysicalQty = (productId: number, val: string) => {
    setOpnameItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        physicalQty: val,
      },
    }));
  };

  const adjustPhysicalQty = (productId: number, adjustment: number) => {
    setOpnameItems((prev) => {
      const currentVal = prev[productId].physicalQty;
      const currentNum = currentVal === "" ? prev[productId].systemQty : parseInt(currentVal) || 0;
      const newVal = Math.max(0, currentNum + adjustment);
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          physicalQty: String(newVal),
        },
      };
    });
  };

  const handleClearPhysicalQty = (productId: number) => {
    setOpnameItems((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        physicalQty: "",
      },
    }));
  };

  // Submit stock opname to server
  const handleSubmitOpname = async () => {
    if (!selectedBranchId) {
      showToast("Harap pilih cabang terlebih dahulu!", "warning");
      return;
    }

    const itemsToSubmit = itemsArray
      .filter((item) => item.physicalQty !== "")
      .map((item) => ({
        product_id: item.productId,
        physical_stock: parseInt(item.physicalQty) || 0,
      }));

    if (itemsToSubmit.length === 0) {
      showToast("Belum ada data opname fisik yang diinput!", "warning");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/stock-opname", {
        branch_id: parseInt(selectedBranchId),
        status: "completed",
        notes: notes.trim() || "Stock opname rutin",
        items: itemsToSubmit,
      });

      showToast("Stock Opname berhasil disimpan dan stok cabang diperbarui!", "success");
      setNotes("");
      
      // Reload products to fetch new updated stock pivot
      const updatedProducts = await fetchProducts();
      setProducts(updatedProducts);
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal menyimpan stock opname.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // WebRTC camera scanner
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
    const scannedProduct = itemsArray.find((item) => (
      item.barcode.toLowerCase() === normalizedCode || item.sku.toLowerCase() === normalizedCode
    ));

    scannerControlsRef.current?.stop();
    playBeep();

    if (!scannedProduct) {
      setScanningMessage(`Kode ${scannedCode} tidak terdaftar di produk.`);
      showToast(`Kode ${scannedCode} tidak terdaftar.`, "warning");
      return;
    }

    setOpnameItems((prev) => {
      const currentVal = prev[scannedProduct.productId].physicalQty;
      const currentNum = currentVal === "" ? prev[scannedProduct.productId].systemQty : parseInt(currentVal) || 0;
      return {
        ...prev,
        [scannedProduct.productId]: {
          ...prev[scannedProduct.productId],
          physicalQty: String(currentNum + 1),
        },
      };
    });

    showToast(`Berhasil memindai: ${scannedProduct.productName} (Jumlah +1)`, "success");
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

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast message={toastMsg} type={toastType} visible={toastVisible} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Stock Opname</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Sesuaikan jumlah stok fisik dengan catatan sistem sistem secara real-time</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadInitialData}>Refresh</Button>
          <Button variant="outline" size="sm" icon={<Camera className="w-4 h-4" />} onClick={() => setCameraOpen(true)}>Scan Barcode</Button>
        </div>
      </div>

      {loading && <Card className="text-sm text-[var(--text-secondary)]">Memuat data Stock Opname...</Card>}

      {!loading && (
        <>
          {/* Controls Panel */}
          <Card className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[var(--brand-600)]" /> Pilih Cabang
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full h-10 px-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              >
                <option value="">Pilih Cabang</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <Input
                label="Catatan Opname (Opsional)"
                placeholder="Misal: Opname Bulanan Mei 2026..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </Card>

          {/* Stats panel */}
          {selectedBranchId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in-up">
              <StatCard label="Produk Diinput" value={`${stats.counted} / ${itemsArray.length}`} changeType="neutral" icon={<ClipboardList className="w-5 h-5" />} />
              <StatCard label="Total Selisih (Pcs)" value={`${stats.totalVar > 0 ? "+" : ""}${stats.totalVar}`} changeType={stats.totalVar === 0 ? "neutral" : stats.totalVar > 0 ? "positive" : "negative"} icon={<Scan className="w-5 h-5" />} />
              <StatCard label="Nilai Dampak Finansial" value={formatIDR(stats.totalValueImpact)} changeType={stats.totalValueImpact === 0 ? "neutral" : stats.totalValueImpact > 0 ? "positive" : "negative"} icon={<DollarSign className="w-5 h-5" />} />
              <Card className="flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-[var(--text-secondary)]">Selesaikan Opname</p>
                    <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                      Terapkan hasil penyesuaian stok ke database.
                    </p>
                  </div>
                  <div className="p-2 bg-[var(--brand-50)] dark:bg-[var(--brand-950)] text-[var(--brand-600)] dark:text-[var(--brand-400)] rounded-lg flex-shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-4">
                  <Button 
                    size="sm" 
                    variant="primary" 
                    className="w-full bg-[var(--brand-600)] hover:bg-[var(--brand-700)] shadow-sm font-semibold text-xs" 
                    onClick={handleSubmitOpname} 
                    loading={submitting}
                    disabled={stats.counted === 0}
                  >
                    Simpan Hasil
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Product Items Table */}
          {selectedBranchId ? (
            <Card className="p-0 border border-[var(--border)] overflow-hidden animate-fade-in-up">
              <div className="p-4 border-b border-[var(--border)] bg-[var(--surface-raised)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5 text-sm">
                  Daftar Stok Produk Cabang
                </h3>
                <div className="relative w-full sm:max-w-xs">
                  <Input
                    placeholder="Cari nama, SKU, atau barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" />}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      <th className="p-4">Produk</th>
                      <th className="p-4 hidden sm:table-cell">SKU / Barcode</th>
                      <th className="p-4 text-center">Stok Sistem</th>
                      <th className="p-4 text-center">Stok Fisik (Input)</th>
                      <th className="p-4 text-center hidden md:table-cell">Selisih</th>
                      <th className="p-4 text-center hidden sm:table-cell">Dampak Nilai</th>
                      <th className="p-4 text-right">Reset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-sm text-[var(--text-primary)]">
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-[var(--text-secondary)]">Tidak ada produk yang ditemukan.</td>
                      </tr>
                    )}
                    {filteredItems.map((item) => {
                      const physNum = item.physicalQty === "" ? null : parseInt(item.physicalQty) || 0;
                      const variance = physNum !== null ? physNum - item.systemQty : null;
                      const valueImpact = variance !== null ? variance * item.costPrice : null;

                      return (
                        <tr key={item.productId} className="hover:bg-[var(--surface-raised)]/50 transition-colors">
                          <td className="p-4">
                            <p className="font-semibold text-[var(--text-primary)]">{item.productName}</p>
                            <p className="text-xxs text-[var(--text-tertiary)] mt-0.5">Biaya: {formatIDR(item.costPrice)}</p>
                          </td>
                          <td className="p-4 font-mono text-xs text-[var(--text-secondary)] hidden sm:table-cell">
                            <div>SKU: {item.sku}</div>
                            {item.barcode && <div className="text-[10px] text-[var(--text-tertiary)]">BC: {item.barcode}</div>}
                          </td>
                          <td className="p-4 text-center font-semibold text-[var(--text-primary)]">{item.systemQty} Pcs</td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1.5 max-w-[150px] mx-auto">
                              <button 
                                type="button"
                                className="w-7 h-7 flex items-center justify-center border border-[var(--border)] rounded-md hover:bg-[var(--slate-100)] dark:hover:bg-[var(--slate-800)] text-sm cursor-pointer select-none active:scale-95 transition-transform"
                                onClick={() => adjustPhysicalQty(item.productId, -1)}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                placeholder={String(item.systemQty)}
                                value={item.physicalQty}
                                onChange={(e) => updatePhysicalQty(item.productId, e.target.value)}
                                className="w-14 h-7 text-center border border-[var(--border)] rounded-md text-xs bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
                              />
                              <button 
                                type="button"
                                className="w-7 h-7 flex items-center justify-center border border-[var(--border)] rounded-md hover:bg-[var(--slate-100)] dark:hover:bg-[var(--slate-800)] text-sm cursor-pointer select-none active:scale-95 transition-transform"
                                onClick={() => adjustPhysicalQty(item.productId, 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-center font-semibold hidden md:table-cell">
                            {variance === null ? (
                              <span className="text-[var(--text-tertiary)]">-</span>
                            ) : variance === 0 ? (
                              <span className="text-gray-400">Pas</span>
                            ) : variance > 0 ? (
                              <span className="text-[var(--success-500)]">+{variance} Pcs</span>
                            ) : (
                              <span className="text-[var(--danger-500)]">{variance} Pcs</span>
                            )}
                          </td>
                          <td className="p-4 text-center font-mono text-xs hidden sm:table-cell">
                            {valueImpact === null ? (
                              <span className="text-[var(--text-tertiary)]">-</span>
                            ) : valueImpact === 0 ? (
                              <span className="text-gray-400">Rp 0</span>
                            ) : valueImpact > 0 ? (
                              <span className="text-[var(--success-500)] font-semibold">+{formatIDR(valueImpact)}</span>
                            ) : (
                              <span className="text-[var(--danger-500)] font-semibold">{formatIDR(valueImpact)}</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              className="p-1 rounded text-[var(--text-tertiary)] hover:text-[var(--danger-500)] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                              disabled={item.physicalQty === ""}
                              onClick={() => handleClearPhysicalQty(item.productId)}
                              title="Reset input"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="block md:hidden divide-y divide-[var(--border)] p-4 space-y-4">
                {filteredItems.length === 0 ? (
                  <div className="py-8 text-center text-sm text-[var(--text-secondary)]">Tidak ada produk yang ditemukan.</div>
                ) : (
                  filteredItems.map((item) => {
                    const physNum = item.physicalQty === "" ? null : parseInt(item.physicalQty) || 0;
                    const variance = physNum !== null ? physNum - item.systemQty : null;
                    const valueImpact = variance !== null ? variance * item.costPrice : null;

                    return (
                      <div key={item.productId} className="py-4 first:pt-0 last:pb-0 flex flex-col gap-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-[var(--text-primary)] text-sm">{item.productName}</p>
                            <p className="text-xs text-[var(--text-tertiary)] mt-0.5">Biaya: {formatIDR(item.costPrice)}</p>
                          </div>
                          {item.physicalQty !== "" && (
                            <button
                              type="button"
                              className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--danger-500)] hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                              onClick={() => handleClearPhysicalQty(item.productId)}
                              title="Reset input"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="text-xs text-[var(--text-secondary)] space-y-1">
                          <p><span className="text-[var(--text-tertiary)]">SKU:</span> <span className="font-mono">{item.sku}</span></p>
                          {item.barcode && <p><span className="text-[var(--text-tertiary)]">Barcode:</span> <span className="font-mono">{item.barcode}</span></p>}
                          <p><span className="text-[var(--text-tertiary)]">Stok Sistem:</span> <span className="font-semibold text-[var(--text-primary)]">{item.systemQty} Pcs</span></p>
                        </div>

                        <div className="flex items-center justify-between mt-1 pt-2 border-t border-dashed border-[var(--border)]">
                          <span className="text-xs text-[var(--text-tertiary)]">Stok Fisik:</span>
                          <div className="flex items-center gap-1.5">
                            <button 
                              type="button"
                              className="w-8 h-8 flex items-center justify-center border border-[var(--border)] rounded-md hover:bg-[var(--slate-100)] dark:hover:bg-[var(--slate-800)] text-sm cursor-pointer select-none active:scale-95 transition-transform"
                              onClick={() => adjustPhysicalQty(item.productId, -1)}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              placeholder={String(item.systemQty)}
                              value={item.physicalQty}
                              onChange={(e) => updatePhysicalQty(item.productId, e.target.value)}
                              className="w-16 h-8 text-center border border-[var(--border)] rounded-md text-xs bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
                            />
                            <button 
                              type="button"
                              className="w-8 h-8 flex items-center justify-center border border-[var(--border)] rounded-md hover:bg-[var(--slate-100)] dark:hover:bg-[var(--slate-800)] text-sm cursor-pointer select-none active:scale-95 transition-transform"
                              onClick={() => adjustPhysicalQty(item.productId, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {variance !== null && (
                          <div className="flex items-center justify-between text-xs bg-[var(--surface-raised)] p-2 rounded-lg border border-[var(--border)]">
                            <div>
                              <span className="text-[var(--text-tertiary)]">Selisih:</span>{" "}
                              {variance === 0 ? (
                                <span className="text-gray-400 font-semibold">Pas</span>
                              ) : variance > 0 ? (
                                <span className="text-[var(--success-500)] font-semibold">+{variance} Pcs</span>
                              ) : (
                                <span className="text-[var(--danger-500)] font-semibold">{variance} Pcs</span>
                              )}
                            </div>
                            <div>
                              <span className="text-[var(--text-tertiary)]">Dampak:</span>{" "}
                              {valueImpact === 0 ? (
                                <span className="text-gray-400 font-semibold">Rp 0</span>
                              ) : valueImpact !== null && valueImpact > 0 ? (
                                <span className="text-[var(--success-500)] font-semibold">+{formatIDR(valueImpact)}</span>
                              ) : (
                                valueImpact !== null && <span className="text-[var(--danger-500)] font-semibold">{formatIDR(valueImpact)}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center text-[var(--text-secondary)] flex flex-col items-center justify-center gap-2">
              <ClipboardList className="w-12 h-12 text-[var(--text-tertiary)] animate-pulse" />
              <p className="font-medium">Harap pilih cabang untuk memulai Stock Opname.</p>
            </Card>
          )}
        </>
      )}

      {/* WEB RTC CAMERA BARCODE SCANNER MODAL */}
      <Modal open={cameraOpen} onClose={() => setCameraOpen(false)} title="Scan Barcode via Kamera WebRTC" size="md">
        <div className="space-y-4">
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-[var(--border)] flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              className={`w-full h-full object-cover ${cameraStream ? "" : "opacity-0"}`}
            />
            {!cameraStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-secondary)] gap-2">
                <div className="w-10 h-10 border-4 border-[var(--brand-600)] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">{scanningMessage}</p>
              </div>
            )}
            
            {/* Scanner overlay target box */}
            {cameraStream && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-28 border-2 border-dashed border-[var(--brand-500)] rounded-md shadow-2xl relative">
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500 animate-pulse shadow-sm" />
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-[var(--surface-raised)] p-3 rounded-lg border border-[var(--border)] flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-[var(--brand-600)] mt-0.5 flex-shrink-0" />
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <p className="font-semibold text-[var(--text-primary)]">Simulasi Deteksi Pemindai Kamera</p>
              <p>Arahkan kamera ke barcode/QR produk. Sistem akan membaca kode asli dan menambah physical stock produk yang cocok sebesar +1.</p>
            </div>
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
          
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setCameraOpen(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Quick helper to resolve missing import
function DollarSign(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  );
}
