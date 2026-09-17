'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FolderKanban,
  Plus,
  Trash2,
  Search,
  Check,
  Loader2,
  AlertCircle,
  Package,
  Layers,
  Sparkles,
  ArrowLeft,
  DollarSign,
  Calendar,
} from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('PLANNING');
  const [targetDate, setTargetDate] = useState('');
  const [budget, setBudget] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  // BOM items selection
  const [selectedItems, setSelectedItems] = useState<
    { itemId: string; name: string; requiredQuantity: number; unit: string; currentStock: number; purchasePrice: number | null; notes: string }[]
  >([]);

  // Item Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debounced search for items
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const json = await res.json();
        if (res.ok) {
          // Filter out already selected items
          const selectedIds = new Set(selectedItems.map((i) => i.itemId));
          setSearchResults((json.results || []).filter((r: any) => !selectedIds.has(r.id)));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedItems]);

  const handleAddItem = (item: any) => {
    setSelectedItems((prev) => [
      ...prev,
      {
        itemId: item.id,
        name: item.name,
        requiredQuantity: 1,
        unit: item.unit || 'cái',
        currentStock: item.quantity ?? 0,
        purchasePrice: item.purchasePrice ?? 0,
        notes: '',
      },
    ]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQty = (index: number, qty: number) => {
    setSelectedItems((prev) => {
      const copy = [...prev];
      copy[index].requiredQuantity = Math.max(0.1, qty);
      return copy;
    });
  };

  const handleUpdateNotes = (index: number, itemNotes: string) => {
    setSelectedItems((prev) => {
      const copy = [...prev];
      copy[index].notes = itemNotes;
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Vui lòng nhập tên dự án');
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          status,
          targetDate: targetDate || null,
          budget: budget ? Number(budget) : null,
          notes: notes.trim() || null,
          items: selectedItems.map((i) => ({
            itemId: i.itemId,
            requiredQuantity: i.requiredQuantity,
            notes: i.notes || null,
          })),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push(`/projects/${data.project.id}`);
      } else {
        setErrorMsg(data.error || 'Lỗi khi tạo dự án');
      }
    } catch {
      setErrorMsg('Không thể kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  const estimatedTotalBOMCost = selectedItems.reduce(
    (acc, curr) => acc + (curr.purchasePrice || 0) * curr.requiredQuantity,
    0
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Navbar title="Tạo dự án mới" showBack backHref="/projects" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Information */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <FolderKanban className="w-5 h-5 text-sky-600" />
            <h2 className="font-bold text-slate-900 dark:text-white text-base">
              Thông tin dự án
            </h2>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tên dự án <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Máy in 3D CoreXY, Đồng hồ LED Vạn Niên ESP32, Robot Dò Line..."
                required
                className="w-full px-4 py-3 text-sm rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Mô tả mục tiêu dự án
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Ghi chú tóm tắt ý tưởng, mục đích chế tạo hoặc link hướng dẫn..."
                className="w-full px-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
                >
                  <option value="PLANNING">Lên kế hoạch</option>
                  <option value="IN_PROGRESS">Đang thi công</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                  <option value="ON_HOLD">Tạm dừng</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Dự kiến hoàn thành
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ngân sách dự kiến (đ)
                </label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="VD: 500000"
                  className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* BOM Parts List Section */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <h2 className="font-bold text-slate-900 dark:text-white text-base">
                Danh sách linh kiện BOM ({selectedItems.length})
              </h2>
            </div>
            {estimatedTotalBOMCost > 0 && (
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg">
                Ước tính: {estimatedTotalBOMCost.toLocaleString('vi-VN')} đ
              </span>
            )}
          </div>

          {/* Search to Add Item */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Tìm và thêm linh kiện vào dự án:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên linh kiện, vi điều khiển, cảm biến, trở, tụ..."
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
              />
              {searching && (
                <Loader2 className="w-4 h-4 text-sky-600 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Dropdown Results */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {searchResults.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAddItem(item)}
                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-3 text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.locationPath || 'Chưa phân vị trí'} &bull; Tồn kho: <strong className="text-slate-800 dark:text-slate-200">{item.quantity} {item.unit}</strong>
                      </div>
                    </div>
                    <span className="shrink-0 p-1.5 bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 rounded-lg font-bold flex items-center gap-1 text-[11px]">
                      <Plus className="w-3.5 h-3.5" /> Thêm
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Items Table / List */}
          {selectedItems.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              Chưa có linh kiện nào được thêm. Hãy gõ tìm kiếm ở ô phía trên để thêm linh kiện vào danh mục BOM.
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedItems.map((item, idx) => {
                const isEnough = item.currentStock >= item.requiredQuantity;

                return (
                  <div
                    key={item.itemId}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`font-semibold text-[11px] ${
                            isEnough ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          Tồn kho: {item.currentStock} {item.unit} ({isEnough ? 'Đủ' : `Thiếu ${item.requiredQuantity - item.currentStock}`})
                        </span>
                        {item.purchasePrice ? (
                          <span className="text-[11px] text-slate-400">
                            &bull; Giá: {item.purchasePrice.toLocaleString('vi-VN')} đ/{item.unit}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="text-[11px] text-slate-400">Cần:</span>
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={item.requiredQuantity}
                          onChange={(e) => handleUpdateQty(idx, parseFloat(e.target.value) || 1)}
                          className="w-16 text-center font-black text-slate-900 dark:text-white bg-transparent focus:outline-none"
                        />
                        <span className="text-[11px] font-medium text-slate-500">{item.unit}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                        title="Xóa linh kiện khỏi BOM"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/projects"
            className="px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
          >
            Hủy bỏ
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-sky-600/20 flex items-center gap-2 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Tạo dự án ngay</span>
          </button>
        </div>
      </form>
    </div>
  );
}
