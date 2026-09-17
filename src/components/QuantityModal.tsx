'use client';

import React, { useState } from 'react';
import { X, Plus, Minus, Check, Loader2, History } from 'lucide-react';

interface QuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  currentQuantity: number;
  unit: string;
  onSuccess: (updatedItem: any) => void;
}

export default function QuantityModal({
  isOpen,
  onClose,
  itemId,
  itemName,
  currentQuantity,
  unit,
  onSuccess,
}: QuantityModalProps) {
  const [type, setType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [amount, setAmount] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const calculatePreview = () => {
    if (type === 'IN') return currentQuantity + (amount || 0);
    if (type === 'OUT') return Math.max(0, currentQuantity - (amount || 0));
    return amount || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 && type !== 'ADJUSTMENT') {
      setError('Số lượng phải lớn hơn 0');
      return;
    }
    if (type === 'OUT' && amount > currentQuantity) {
      setError(`Không thể xuất quá số lượng hiện có (${currentQuantity} ${unit})`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/items/${itemId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          amount: Number(amount),
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi cập nhật số lượng');
      }

      onSuccess(data.item);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
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
              Điều chỉnh số lượng
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
          {/* Action Tabs */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setType('IN');
                setAmount(1);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                type === 'IN'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              + Nhập thêm
            </button>
            <button
              type="button"
              onClick={() => {
                setType('OUT');
                setAmount(1);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                type === 'OUT'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              - Xuất / Dùng
            </button>
            <button
              type="button"
              onClick={() => {
                setType('ADJUSTMENT');
                setAmount(currentQuantity);
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                type === 'ADJUSTMENT'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              ± Đặt số mới
            </button>
          </div>

          {/* Current & Preview Total */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-500">Hiện có: </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {currentQuantity} {unit}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Sau điều chỉnh: </span>
              <span className="font-bold text-sky-600 dark:text-sky-400 text-sm">
                {calculatePreview()} {unit}
              </span>
            </div>
          </div>

          {/* Quantity Input with Stepper */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {type === 'ADJUSTMENT' ? 'Tổng số lượng mới' : 'Số lượng thay đổi'}
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAmount((prev) => Math.max(type === 'ADJUSTMENT' ? 0 : 1, prev - 1))}
                className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold active:scale-95 transition-transform"
              >
                <Minus className="w-5 h-5" />
              </button>
              <input
                type="number"
                min={type === 'ADJUSTMENT' ? 0 : 1}
                step="any"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="flex-1 h-11 text-center text-lg font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setAmount((prev) => prev + 1)}
                className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold active:scale-95 transition-transform"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            {type !== 'ADJUSTMENT' && (
              <div className="flex items-center gap-1.5 mt-2">
                {[1, 5, 10, 20, 50].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setAmount(num)}
                    className="flex-1 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    +{num}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Note Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú lịch sử (tùy chọn)
            </label>
            <input
              type="text"
              placeholder={
                type === 'IN'
                  ? 'Ví dụ: Mua thêm từ Shopee'
                  : type === 'OUT'
                  ? 'Ví dụ: Dùng lắp tủ điện phòng khách'
                  : 'Ví dụ: Kiểm kê lại kho'
              }
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
            />
          </div>

          {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

          {/* Submit Buttons */}
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
              <span>Xác nhận</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
