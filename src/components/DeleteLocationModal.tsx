'use client';

import React, { useState } from 'react';
import {
  X,
  Trash2,
  AlertTriangle,
  Loader2,
  Package,
  Layers,
  AlertCircle,
} from 'lucide-react';

interface DeleteLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: {
    id: string;
    name: string;
    code?: string | null;
    totalItemsCount?: number;
    totalDescendantItemTypes?: number;
    itemsCount?: number;
    _count?: { items?: number; children?: number };
  } | null;
  onDeleted: () => void;
}

export default function DeleteLocationModal({
  isOpen,
  onClose,
  location,
  onDeleted,
}: DeleteLocationModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !location) return null;

  // Determine items count in location or sub-locations
  const itemCount =
    location.totalItemsCount ??
    location.totalDescendantItemTypes ??
    location.itemsCount ??
    location._count?.items ??
    0;

  const hasItems = itemCount > 0;

  const handleDelete = async () => {
    if (hasItems) return;

    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/locations/${location.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi xóa vị trí lưu trữ');
      }

      onDeleted();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi xóa');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-rose-50/40 dark:bg-rose-950/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Xóa vị trí lưu trữ
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium truncate max-w-[220px]">
                {location.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Location Summary Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white text-sm">
                {location.name}
              </span>
              {location.code && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {location.code}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-sky-600" />
                <span>
                  Vật tư: <strong className="text-slate-800 dark:text-slate-200">{itemCount}</strong> món
                </span>
              </div>
            </div>
          </div>

          {/* Warning Condition */}
          {hasItems ? (
            <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Không thể xóa vị trí đang có vật tư</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                Vị trí này (hoặc các nhánh con) đang chứa <strong>{itemCount}</strong> vật tư linh kiện. Vui lòng chuyển các vật tư sang vị trí khác hoặc xóa vật tư trước khi xóa vị trí kho.
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Xác nhận xóa vĩnh viễn</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-300">
                Bạn có chắc chắn muốn xóa vị trí <strong>{location.name}</strong> không? Hành động này không thể hoàn tác.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={hasItems || deleting}
              onClick={handleDelete}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-rose-600/20 flex items-center gap-1.5 transition-all"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              <span>{hasItems ? 'Không thể xóa (còn vật tư)' : 'Xác nhận xóa'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
