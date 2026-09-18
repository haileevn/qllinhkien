'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Edit,
  FolderTree,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  ArrowRightLeft,
  MapPin,
} from 'lucide-react';

interface EditLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: {
    id: string;
    name: string;
    code?: string | null;
    description?: string | null;
    parentId?: string | null;
  } | null;
  allLocations: Array<{
    id: string;
    name: string;
    code?: string | null;
    parentId?: string | null;
  }>;
  onSaved: () => void;
}

export default function EditLocationModal({
  isOpen,
  onClose,
  location,
  allLocations = [],
  onSaved,
}: EditLocationModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (location) {
      setName(location.name || '');
      setCode(location.code || '');
      setDescription(location.description || '');
      setParentId(location.parentId || '');
      setError(null);
    }
  }, [location, isOpen]);

  if (!isOpen || !location) return null;

  // Compute all descendant IDs of the current location to prevent cycle selection
  const getDescendantIds = (targetId: string): Set<string> => {
    const descendants = new Set<string>([targetId]);
    let added = true;
    while (added) {
      added = false;
      for (const loc of allLocations) {
        if (loc.parentId && descendants.has(loc.parentId) && !descendants.has(loc.id)) {
          descendants.add(loc.id);
          added = true;
        }
      }
    }
    return descendants;
  };

  const forbiddenParentIds = getDescendantIds(location.id);
  const availableParents = allLocations.filter((loc) => !forbiddenParentIds.has(loc.id));

  // Helper to generate a collision-resistant unique code
  const handleGenerateCode = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let rand = '';
    for (let i = 0; i < 6; i++) {
      rand += chars[Math.floor(Math.random() * chars.length)];
    }
    setCode(`H2T-LOC-${rand}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tên vị trí / kho không được để trống');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/locations/${location.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || null,
          description: description.trim() || null,
          parentId: parentId || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi cập nhật vị trí');
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi lưu');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold">
              <Edit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Chỉnh sửa / Chuyển vị trí kho
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[260px]">
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Location Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Tên vị trí / Tủ kho <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Phòng làm việc, Tủ A, Ngăn 3, Hộp A3-05..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white font-medium"
            />
          </div>

          {/* Location Code & Auto-generator */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mã định danh vị trí (Code)
              </label>
              <button
                type="button"
                onClick={handleGenerateCode}
                className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Sinh mã tự động</span>
              </button>
            </div>
            <input
              type="text"
              placeholder="Ví dụ: H2T-LOC-TU-A, NGAN-03, BOX-12..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Move Parent Location / Hierarchy */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
              <span>Chuyển vào vị trí cha (Parent Location)</span>
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white font-medium"
            >
              <option value="">(Cấp cao nhất - Kho gốc độc lập / Không có cha)</option>
              {availableParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `[${p.code}] ` : ''}
                  {p.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Bạn có thể di chuyển cả ngăn này sang tủ khác, hoặc chuyển thành kho gốc độc lập bất cứ lúc nào.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Mô tả &amp; Ghi chú
            </label>
            <textarea
              rows={2}
              placeholder="Ghi chú về sức chứa, đồ vật cất tại đây..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:opacity-50 rounded-xl shadow-md shadow-sky-600/20 flex items-center gap-1.5 transition-all"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
