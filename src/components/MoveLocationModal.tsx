'use client';

import React, { useState, useEffect } from 'react';
import { X, Check, Loader2, ArrowRight, MapPin } from 'lucide-react';

interface MoveLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  currentLocationId: string;
  currentLocationName: string;
  currentContainer?: string | null;
  currentExactPosition?: string | null;
  onSuccess: (updatedItem: any) => void;
}

export default function MoveLocationModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  currentLocationId,
  currentLocationName,
  currentContainer,
  currentExactPosition,
  onSuccess,
}: MoveLocationModalProps) {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState(currentLocationId);
  const [container, setContainer] = useState(currentContainer || '');
  const [exactPosition, setExactPosition] = useState(currentExactPosition || '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingLocations, setFetchingLocations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchLocations();
      setSelectedLocationId(currentLocationId);
      setContainer(currentContainer || '');
      setExactPosition(currentExactPosition || '');
    }
  }, [isOpen, currentLocationId, currentContainer, currentExactPosition]);

  const fetchLocations = async () => {
    try {
      setFetchingLocations(true);
      const res = await fetch('/api/locations?format=flat');
      const data = await res.json();
      if (res.ok && data.locations) {
        setLocations(data.locations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFetchingLocations(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocationId) {
      setError('Vui lòng chọn vị trí lưu trữ mới');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/items/${itemId}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationLocationId: selectedLocationId,
          container: container.trim() || null,
          exactPosition: exactPosition.trim() || null,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi chuyển vị trí');
      }

      onSuccess(data.item);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi chuyển vị trí');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Chuyển vị trí lưu trữ
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[280px]">
              {itemName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Current Location Badge */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-slate-500">Vị trí hiện tại: </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              📍 {currentLocationName}
            </span>
          </div>

          {/* New Location Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Chọn vị trí mới *
            </label>
            {fetchingLocations ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tải danh sách kho...</span>
              </div>
            ) : (
              <select
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.code ? `[${loc.code}] ` : ''}
                    {loc.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Container (Tủ / Kệ) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tủ / Kệ / Thùng
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Tủ linh kiện B, Kệ sắt 2"
              value={container}
              onChange={(e) => setContainer(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Exact Position (Ngăn / Hộp) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ngăn / Hộp / Vị trí chi tiết
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Ngăn 2 → Hộp B2-01"
              value={exactPosition}
              onChange={(e) => setExactPosition(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Lý do chuyển (tùy chọn)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Gom về kho chung"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-sm transition-all"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Lưu chuyển vị trí</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
