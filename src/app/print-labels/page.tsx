'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Printer,
  ArrowLeft,
  Loader2,
  MapPin,
  CheckSquare,
  Square,
  Sliders,
  FolderKanban,
  Box,
  Layers,
  Sparkles,
  Settings2,
} from 'lucide-react';
import { clsx } from 'clsx';

function PrintLabelsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialLocationId = searchParams.get('locationId') || '';
  const initialProjectId = searchParams.get('projectId') || '';

  const [mode, setMode] = useState<'items' | 'locations' | 'project'>(
    initialProjectId ? 'project' : 'items'
  );

  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>({});
  const [selectedLocationIds, setSelectedLocationIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Layout & Content customizer
  const [gridColumns, setGridColumns] = useState<number>(2); // 1 (roll), 2, 3, 4
  const [showQr, setShowQr] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showPrice, setShowPrice] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (mode === 'items') {
      fetchItems(selectedLocationId);
    } else if (mode === 'project') {
      fetchProjectItems(selectedProjectId);
    }
  }, [mode, selectedLocationId, selectedProjectId]);

  const fetchInitialData = async () => {
    try {
      const [locRes, projRes] = await Promise.all([
        fetch('/api/locations?format=flat'),
        fetch('/api/projects'),
      ]);

      if (locRes.ok) {
        const locData = await locRes.json();
        const locs = locData.locations || [];
        setLocations(locs);
        const initLocSel: Record<string, boolean> = {};
        locs.forEach((l: any) => (initLocSel[l.id] = true));
        setSelectedLocationIds(initLocSel);
      }

      if (projRes.ok) {
        const projData = await projRes.json();
        const projs = projData.projects || [];
        setProjects(projs);
        if (!selectedProjectId && projs.length > 0) {
          setSelectedProjectId(projs[0].id);
        }
      }
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
        const initSelected: Record<string, boolean> = {};
        list.forEach((i: any) => (initSelected[i.id] = true));
        setSelectedItemIds(initSelected);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectItems = async (projId: string) => {
    if (!projId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projId}`);
      const data = await res.json();
      if (res.ok && data.project) {
        const pItems = (data.project.items || []).map((pi: any) => ({
          ...pi.item,
          requiredQuantity: pi.requiredQuantity,
        })).filter((i: any) => i && i.id);
        setItems(pItems);
        const initSelected: Record<string, boolean> = {};
        pItems.forEach((i: any) => (initSelected[i.id] = true));
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
    if (mode === 'locations') {
      const updated: Record<string, boolean> = {};
      locations.forEach((l) => (updated[l.id] = val));
      setSelectedLocationIds(updated);
    } else {
      const updated: Record<string, boolean> = {};
      items.forEach((i) => (updated[i.id] = val));
      setSelectedItemIds(updated);
    }
  };

  const selectedItems = items.filter((i) => selectedItemIds[i.id]);
  const selectedLocs = locations.filter((l) => selectedLocationIds[l.id]);

  const totalSelectedCount = mode === 'locations' ? selectedLocs.length : selectedItems.length;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-3 sm:p-6 print:p-0 print:bg-white print:dark:bg-white">
      {/* Top Controls (Hidden when printing) */}
      <div className="no-print max-w-4xl mx-auto mb-6 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                In tem nhãn mã QR hàng loạt
              </h1>
              <p className="text-xs text-slate-400">
                In tem dán khay linh kiện, tem bộ BOM dự án hoặc tem định danh vị trí/ngăn tủ
              </p>
            </div>
          </div>

          <button
            onClick={() => window.print()}
            disabled={totalSelectedCount === 0}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>In {totalSelectedCount} tem</span>
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-semibold">
          <button
            onClick={() => setMode('items')}
            className={clsx(
              'flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5',
              mode === 'items'
                ? 'bg-white dark:bg-slate-900 text-sky-600 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <Layers className="w-4 h-4" />
            <span>Tem Vật tư theo kho</span>
          </button>

          <button
            onClick={() => setMode('project')}
            className={clsx(
              'flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5',
              mode === 'project'
                ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <FolderKanban className="w-4 h-4" />
            <span>Tem Bộ linh kiện BOM Dự án</span>
          </button>

          <button
            onClick={() => setMode('locations')}
            className={clsx(
              'flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5',
              mode === 'locations'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            )}
          >
            <Box className="w-4 h-4" />
            <span>Tem Định danh Tủ / Ngăn</span>
          </button>
        </div>

        {/* Filter & Layout Selection Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {mode === 'items' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lọc theo vị trí kho
              </label>
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
              >
                <option value="">Tất cả kho ({items.length} vật tư)</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === 'project' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Chọn Dự án BOM cần in
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
              >
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.name} ({proj.itemCount || proj.items?.length || 0} món)
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === 'locations' && (
            <div className="flex items-end">
              <span className="text-xs text-slate-500">
                In nhãn dán mã QR cho {locations.length} tủ/ngăn lưu trữ.
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Khổ giấy & Bố cục tem
            </label>
            <select
              value={gridColumns}
              onChange={(e) => setGridColumns(parseInt(e.target.value, 10))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-medium"
            >
              <option value={2}>A4 - 2 cột (Tem vừa 80x45mm)</option>
              <option value={3}>A4 - 3 cột (Tem nhỏ 60x35mm)</option>
              <option value={4}>A4 - 4 cột (Tem mini 45x25mm)</option>
              <option value={1}>Máy in nhiệt cuộn (Sticker Roll / 1 tem đơn)</option>
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

        {/* Customizable Toggles */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-4 flex-wrap text-xs text-slate-600 dark:text-slate-300">
          <span className="font-bold text-[11px] uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Settings2 className="w-3.5 h-3.5" /> Hiển thị trên tem:
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showQr} onChange={(e) => setShowQr(e.target.checked)} className="rounded" />
            <span>Mã QR</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showLocation} onChange={(e) => setShowLocation(e.target.checked)} className="rounded" />
            <span>Đường dẫn vị trí</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showSku} onChange={(e) => setShowSku(e.target.checked)} className="rounded" />
            <span>Mã SKU / Code</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} className="rounded" />
            <span>Giá tiền (VNĐ)</span>
          </label>
        </div>

        {/* Item Selection Pills */}
        {mode !== 'locations' && (
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
        )}
      </div>

      {/* Printable Sheet Grid */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="py-20 flex justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          </div>
        ) : totalSelectedCount === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Chưa có tem nào được chọn để in.
          </div>
        ) : mode === 'locations' ? (
          /* Locations Label Grid */
          <div
            className={clsx(
              'grid gap-3.5 p-2 print:p-0 print:gap-2',
              gridColumns === 1
                ? 'grid-cols-1 max-w-sm mx-auto'
                : gridColumns === 3
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                : gridColumns === 4
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2'
            )}
          >
            {selectedLocs.map((loc) => {
              const qrData = `LOC:${loc.id}`;
              return (
                <div
                  key={loc.id}
                  className="printable-card bg-white text-black p-3.5 rounded-2xl border-2 border-black flex flex-col justify-between space-y-2 shadow-sm font-sans break-inside-avoid"
                >
                  <div className="flex items-center justify-between border-b border-black/20 pb-1 text-[10px]">
                    <span className="font-black px-1.5 py-0.5 bg-black text-white rounded">
                      H2T STORAGE
                    </span>
                    {loc.code && <span className="font-mono font-bold">{loc.code}</span>}
                  </div>

                  <div className="flex items-center gap-3">
                    {showQr && (
                      <div className="flex flex-col items-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(
                            qrData
                          )}`}
                          alt="QR"
                          className="w-16 h-16 border border-black p-0.5"
                        />
                        <span className="text-[8px] font-mono font-bold mt-0.5">{qrData}</span>
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-sm text-black leading-tight">
                        {loc.name}
                      </h3>
                      {loc.description && (
                        <p className="text-[10px] text-slate-600 mt-1 line-clamp-2">
                          {loc.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-black/20 pt-1 text-[9px] font-bold text-slate-600 flex items-center gap-1">
                    <Box className="w-3 h-3 text-black" />
                    <span>Dán tại khay / ngăn / tủ lưu trữ</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Items / BOM Kit Label Grid */
          <div
            className={clsx(
              'grid gap-3.5 p-2 print:p-0 print:gap-2',
              gridColumns === 1
                ? 'grid-cols-1 max-w-sm mx-auto'
                : gridColumns === 3
                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                : gridColumns === 4
                ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                : 'grid-cols-1 sm:grid-cols-2'
            )}
          >
            {selectedItems.map((item) => {
              const qrData = item.qrCodeValue || `ITEM:${item.id}`;
              const locStr = [item.location?.name, item.container, item.exactPosition]
                .filter(Boolean)
                .join(' → ');

              return (
                <div
                  key={item.id}
                  className="printable-card bg-white text-black p-3.5 rounded-2xl border-2 border-black flex flex-col justify-between space-y-2 shadow-sm font-sans break-inside-avoid"
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between border-b border-black/20 pb-1.5 text-[10px]">
                    <div className="flex items-center gap-1">
                      <span className="font-black px-1 py-0.2 bg-black text-white rounded">
                        H2T
                      </span>
                      <span className="font-bold uppercase text-slate-700 truncate max-w-[120px]">
                        {item.category?.name || 'Vật tư'}
                      </span>
                    </div>
                    {showSku && item.sku && (
                      <span className="font-mono font-bold text-black">{item.sku}</span>
                    )}
                  </div>

                  {/* QR & Info */}
                  <div className="flex items-center gap-2.5">
                    {showQr && (
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
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-xs leading-snug line-clamp-2 text-black">
                        {item.name}
                      </h3>
                      {(item.brand || item.model) && (
                        <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                          {[item.brand, item.model].filter(Boolean).join(' - ')}
                        </p>
                      )}
                      {showPrice && item.purchasePrice && (
                        <div className="text-[10px] font-bold text-black mt-1">
                          {item.purchasePrice.toLocaleString('vi-VN')} đ / {item.unit}
                        </div>
                      )}
                      {item.requiredQuantity && (
                        <div className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded inline-block mt-1">
                          Cần: {item.requiredQuantity} {item.unit}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Location Path */}
                  {showLocation && locStr && (
                    <div className="border-t border-black/20 pt-1 text-[10px] font-bold text-black flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{locStr}</span>
                    </div>
                  )}
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
