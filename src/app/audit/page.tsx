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
} from 'lucide-react';
import Navbar from '@/components/Navbar';

function AuditContent() {
  const searchParams = useSearchParams();
  const initialLocationId = searchParams.get('locationId') || '';

  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifiedMap, setVerifiedMap] = useState<Record<string, boolean>>({});
  const [adjustingId, setAdjustingId] = useState<string | null>(null);

  useEffect(() => {
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
    } catch {}
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

  const verifiedCount = Object.keys(verifiedMap).length;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <Navbar title="Kiểm kê kho vật tư" showBack />

      {/* Select Location for Audit */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sky-600 font-bold text-sm">
          <ClipboardCheck className="w-5 h-5" />
          <span>Chọn vị trí hoặc ngăn cần kiểm kê</span>
        </div>

        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.code ? `[${loc.code}] ` : ''}
              {loc.name}
            </option>
          ))}
        </select>

        {items.length > 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span>
              Tiến độ kiểm kê: <strong>{verifiedCount}</strong> / {items.length} vật tư
            </span>
            <div className="w-32 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(verifiedCount / Math.max(1, items.length)) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Items Audit Checklist */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <span className="text-xs">Đang tải vật tư trong vị trí này...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-xs text-slate-500 space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p>Không có vật tư nào được lưu trong vị trí này.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {items.map((item) => {
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {item.name}
                      </h3>
                      {isVerified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1 shrink-0">
                          <Check className="w-3 h-3" />
                          Đã kiểm
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5">
                      {[item.brand, item.sku && `SKU: ${item.sku}`, item.exactPosition].filter(Boolean).join(' • ')}
                    </div>
                  </div>

                  {/* Fast Counter & Confirm Actions */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
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
                        {isAdjusting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : item.quantity}
                        <span className="text-[10px] font-normal text-slate-400 block -mt-1">{item.unit}</span>
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
