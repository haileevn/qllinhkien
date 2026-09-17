'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ClipboardCheck,
  MapPin,
  Check,
  Plus,
  Minus,
  Loader2,
  Package,
  AlertCircle,
  RefreshCw,
  QrCode,
  Search,
  CheckCircle2,
  Sparkles,
  Coins,
  CheckCheck,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import QRScannerModal from '@/components/QRScannerModal';
import { removeVietnameseTones } from '@/lib/vietnamese';
import { canEdit } from '@/lib/permissions';

function AuditContent() {
  const searchParams = useSearchParams();
  const initialLocationId = searchParams.get('locationId') || '';

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({});
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  // QR Scanner modal state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanNotification, setScanNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  // Filters
  const [filterTab, setFilterTab] = useState<'all' | 'unverified' | 'verified'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedLocationId) {
      fetchItemsInLocation(selectedLocationId);
    } else {
      setItems([]);
    }
  }, [selectedLocationId]);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations?format=flat');
      const data = await res.json();
      if (res.ok && data.locations) {
        setLocations(data.locations);
        if (!selectedLocationId && data.locations.length > 0) {
          setSelectedLocationId(data.locations[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchItemsInLocation = async (locId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/locations/${locId}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setVerifiedMap({});
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const markVerified = (itemId: string) => {
    setVerifiedMap((prev) => ({ ...prev, [itemId]: true }));
  };

  const markAllVerified = () => {
    const newMap: Record<string, boolean> = {};
    items.forEach((item) => {
      newMap[item.id] = true;
    });
    setVerifiedMap(newMap);
    showToast('success', `Đã xác nhận khớp toàn bộ ${items.length} vật tư trong khu vực!`);
  };

  const resetVerification = () => {
    setVerifiedMap({});
    showToast('info', 'Đã đặt lại trạng thái kiểm kê của khu vực.');
  };

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setScanNotification({ type, message });
    setTimeout(() => {
      setScanNotification(null);
    }, 4000);
  };

  const handleScanSuccess = async (decodedText: string) => {
    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(decodedText)}`);
      const data = await res.json();

      if (res.ok) {
        if (data.type === 'location') {
          setSelectedLocationId(data.id);
          showToast('success', `Đã chuyển đến vị trí kiểm kê: ${data.name}`);
        } else if (data.type === 'item') {
          // Fetch item details to verify location
          const itemRes = await fetch(`/api/items/${data.id}`);
          const itemData = await itemRes.json();
          if (itemRes.ok && itemData.item) {
            const itm = itemData.item;
            if (itm.locationId && itm.locationId !== selectedLocationId) {
              setSelectedLocationId(itm.locationId);
            }
            markVerified(itm.id);
            showToast('success', `✓ Đã khớp kiểm kê: ${itm.name}`);
          }
        }
      } else {
        showToast('error', `Không tìm thấy mã vạch / QR: ${decodedText}`);
      }
    } catch {
      showToast('error', 'Lỗi tra cứu mã quét');
    }
  };

  const adjustQty = async (item: any, delta: number) => {
    const newQty = Math.max(0, item.quantity + delta);
    setAdjustingId(item.id);

    try {
      const res = await fetch(`/api/items/${item.id}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ADJUSTMENT',
          amount: newQty,
          note: `Kiểm kê kho tại ${locations.find((l) => l.id === selectedLocationId)?.name || 'vị trí'}`,
        }),
      });

      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, quantity: newQty } : i))
        );
        markVerified(item.id);
      }
    } catch {
    } finally {
      setAdjustingId(null);
    }
  };

  const verifiedCount = Object.keys(verifiedMap).filter((id) =>
    items.some((i) => i.id === id)
  ).length;
  const unverifiedCount = Math.max(0, items.length - verifiedCount);
  const percentComplete = items.length > 0 ? Math.round((verifiedCount / items.length) * 100) : 0;

  const totalQuantity = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
  const totalValuation = items.reduce(
    (sum, i) => sum + (i.price || 0) * (i.quantity || 0),
    0
  );

  const filteredItems = items.filter((item) => {
    const isVer = !!verifiedMap[item.id];
    if (filterTab === 'unverified' && isVer) return false;
    if (filterTab === 'verified' && !isVer) return false;

    if (searchQuery.trim()) {
      const q = removeVietnameseTones(searchQuery.toLowerCase());
      const name = removeVietnameseTones((item.name || '').toLowerCase());
      const sku = removeVietnameseTones((item.sku || '').toLowerCase());
      const brand = removeVietnameseTones((item.brand || '').toLowerCase());
      const pos = removeVietnameseTones((item.exactPosition || '').toLowerCase());
      return name.includes(q) || sku.includes(q) || brand.includes(q) || pos.includes(q);
    }

    return true;
  });

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-10">
      <Navbar
        title="Kiểm kê kho thực tế"
        showBack
        action={
          <button
            onClick={() => setScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <QrCode className="w-4 h-4" />
            <span>Quét QR kiểm kê</span>
          </button>
        }
      />

      {/* Notification Toast */}
      {scanNotification && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-2 shadow-sm animate-in fade-in slide-in-from-top duration-200 ${
            scanNotification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : scanNotification.type === 'error'
              ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
              : 'bg-sky-50 dark:bg-sky-950/60 border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {scanNotification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-sky-600 shrink-0" />
            )}
            <span>{scanNotification.message}</span>
          </div>
        </div>
      )}

      {/* Location Selector & Valuation Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sky-600 font-black text-sm">
            <ClipboardCheck className="w-5 h-5" />
            <span>Chọn vị trí hoặc ngăn cần kiểm kê</span>
          </div>

          <button
            onClick={() => setScannerOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <QrCode className="w-3.5 h-3.5 text-sky-600" />
            <span>Quét tem vị trí / tem vật tư</span>
          </button>
        </div>

        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.code ? `[${loc.code}] ` : ''}
              {loc.name}
            </option>
          ))}
        </select>

        {/* Progress bar and Quick bulk actions */}
        {items.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400">Tiến độ đối chiếu:</span>
                <span className="font-black text-slate-900 dark:text-white">
                  {verifiedCount} / {items.length} ({percentComplete}%)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={markAllVerified}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold text-xs flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Xác nhận đúng tất cả</span>
                </button>

                {verifiedCount > 0 && (
                  <button
                    type="button"
                    onClick={resetVerification}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Đặt lại kiểm kê"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${percentComplete}%` }}
              />
            </div>

            {/* Micro Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] pt-1">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                Tổng số món tồn: <strong className="text-slate-900 dark:text-white">{totalQuantity.toLocaleString('vi-VN')}</strong>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                Định giá khu vực: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{totalValuation.toLocaleString('vi-VN')} đ</strong>
              </div>
              <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                Chưa đối soát: <strong className="text-amber-600 dark:text-amber-400">{unverifiedCount} món</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Tabs */}
      {items.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl w-fit">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Tất cả ({items.length})
            </button>
            <button
              onClick={() => setFilterTab('unverified')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterTab === 'unverified'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Chưa kiểm ({unverifiedCount})
            </button>
            <button
              onClick={() => setFilterTab('verified')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filterTab === 'verified'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Đã khớp ({verifiedCount})
            </button>
          </div>

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Lọc vật tư theo tên, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Items Audit Checklist */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <span className="text-xs">Đang tải danh mục vật tư trong khu vực này...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-xs text-slate-500 space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p>Không có vật tư nào được lưu trong vị trí này.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 text-xs text-slate-400">
            Không tìm thấy vật tư phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredItems.map((item) => {
              const isVerified = !!verifiedMap[item.id];
              const isAdjusting = adjustingId === item.id;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isVerified
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {item.name}
                      </h3>
                      {item.price > 0 && (
                        <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.price.toLocaleString('vi-VN')} đ
                        </span>
                      )}
                      {isVerified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                          <Check className="w-3 h-3" />
                          Đã khớp
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-1">
                      {[
                        item.brand,
                        item.sku && `SKU: ${item.sku}`,
                        item.exactPosition && `Ô: ${item.exactPosition}`,
                        item.location?.name && `Vị trí: ${item.location.name}`,
                      ]
                        .filter(Boolean)
                        .join(' • ')}
                    </div>
                  </div>

                  {/* Fast Counter & Confirm Actions */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {canEdit(currentUser?.role) ? (
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                          type="button"
                          disabled={isAdjusting}
                          onClick={() => adjustQty(item, -1)}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition-transform"
                        >
                          <Minus className="w-4 h-4" />
                        </button>

                        <div className="w-16 text-center font-black text-sm text-slate-900 dark:text-white">
                          {isAdjusting ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          ) : (
                            item.quantity
                          )}
                          <span className="text-[10px] font-normal text-slate-400 block -mt-1">
                            {item.unit}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={isAdjusting}
                          onClick={() => adjustQty(item, 1)}
                          className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 active:scale-95 transition-transform"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
                        <div className="font-black text-sm text-slate-900 dark:text-white">
                          {item.quantity}
                        </div>
                        <span className="text-[10px] text-slate-400 block -mt-1">
                          {item.unit}
                        </span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => markVerified(item.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                        isVerified
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-emerald-100 hover:text-emerald-700'
                      }`}
                    >
                      {isVerified ? '✓ Đã đúng' : 'Khớp'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Scanner Modal */}
      {scannerOpen && (
        <QRScannerModal
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
      )}
    </div>
  );
}

export default function AuditPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-400">Đang tải...</div>}>
      <AuditContent />
    </Suspense>
  );
}
