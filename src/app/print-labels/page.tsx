'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Printer, ArrowLeft, Loader2, MapPin, CheckSquare, Square, Sliders } from 'lucide-react';

function PrintLabelsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialLocationId = searchParams.get('locationId') || '';

  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId);
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [gridColumns, setGridColumns] = useState<number>(2); // 2 or 3 columns per row

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    fetchItems(selectedLocationId);
  }, [selectedLocationId]);

  const fetchLocations = async () => {
    try {
      const res = await fetch('/api/locations?format=flat');
      const data = await res.json();
      if (res.ok) setLocations(data.locations || []);
    } catch {}
  };

  const fetchItems = async (locId: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (locId) params.set('locationId', locId);
      const res = await fetch(`/api/items?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        const list = data.items || [];
        setItems(list);
        // Select all by default
        const initSelected: Record<string, boolean> = {};
        list.forEach((i: any) => (initSelected[i.id] = true));
        setSelectedItemIds(initSelected);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: string) => {
    setSelectedItemIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = (val: boolean) => {
    const updated: Record<string, boolean> = {};
    items.forEach((i) => (updated[i.id] = val));
    setSelectedItemIds(updated);
  };

  const selectedItems = items.filter((i) => selectedItemIds[i.id]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-3 sm:p-6">
      {/* Top Controls (Hidden when printing) */}
      <div className="no-print max-w-4xl mx-auto mb-6 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
              In bảng tem nhãn QR hàng loạt (Sticker Sheet)
            </h1>
          </div>

          <button
            onClick={() => window.print()}
            disabled={selectedItems.length === 0}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>In {selectedItems.length} tem nhãn</span>
          </button>
        </div>

        {/* Filter & Layout Selection Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lọc theo vị trí kho
            </label>
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
            >
              <option value="">Tất cả kho ({items.length} vật tư)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Bố cục in tem
            </label>
            <select
              value={gridColumns}
              onChange={(e) => setGridColumns(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl"
            >
              <option value={2}>2 cột (Tem vừa - Chuẩn decal 2 hàng)</option>
              <option value={3}>3 cột (Tem nhỏ - Tiết kiệm giấy)</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => selectAll(true)}
              className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-semibold"
            >
              Chọn tất cả
            </button>
            <button
              type="button"
              onClick={() => selectAll(false)}
              className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl font-semibold"
            >
              Bỏ chọn
            </button>
          </div>
        </div>

        {/* Item Selection Pills */}
        <div className="flex items-center gap-1.5 flex-wrap max-h-32 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
          {items.map((item) => {
            const isSel = !!selectedItemIds[item.id];
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
                  isSel
                    ? 'bg-sky-600 text-white'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                {isSel ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                <span className="truncate max-w-[150px]">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Printable Sheet Grid (Formatted for A4 / Decal Sticker paper) */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="py-20 flex justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        ) : selectedItems.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Chưa có tem nào được chọn để in.
          </div>
        ) : (
          <div
            className={`grid gap-3.5 p-2 ${
              gridColumns === 3 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
            }`}
          >
            {selectedItems.map((item) => {
              const qrData = item.qrCodeValue || `ITEM:${item.id}`;
              const locStr = [item.location?.name, item.container, item.exactPosition]
                .filter(Boolean)
                .join(' → ');

              return (
                <div
                  key={item.id}
                  className="printable-card bg-white text-black p-3.5 rounded-2xl border-2 border-black flex flex-col justify-between space-y-2 shadow-sm font-sans"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between border-b border-black/20 pb-1.5 text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="font-black px-1 py-0.2 bg-black text-white rounded">
                        H2T
                      </span>
                      <span className="font-bold uppercase text-slate-700">
                        {item.category?.name || 'Vật tư'}
                      </span>
                    </div>
                    {item.sku && <span className="font-mono font-bold text-black">{item.sku}</span>}
                  </div>

                  {/* QR & Info */}
                  <div className="flex items-center gap-2.5">
                    <div className="flex flex-col items-center shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&margin=0&data=${encodeURIComponent(
                          qrData
                        )}`}
                        alt="QR"
                        className="w-16 h-16 border border-black p-0.5"
                      />
                      <span className="text-[8px] font-mono font-bold text-black mt-0.5 uppercase max-w-[70px] truncate">
                        {qrData}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-xs leading-snug line-clamp-2 text-black">
                        {item.name}
                      </h3>
                      {(item.brand || item.model) && (
                        <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                          {[item.brand, item.model].filter(Boolean).join(' - ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location Path */}
                  <div className="border-t border-black/20 pt-1 text-[10px] font-bold text-black flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{locStr}</span>
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

export default function PrintLabelsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-400">Đang tải trang in tem...</div>}>
      <PrintLabelsContent />
    </Suspense>
  );
}
