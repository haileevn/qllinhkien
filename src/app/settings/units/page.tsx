'use client';

import React, { useState, useEffect } from 'react';
import { Scale, Plus, Trash2, Check, X, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function UnitsPage() {
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUnits();
  }, []);

  const fetchUnits = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/units');
      const data = await res.json();
      if (res.ok) setUnits(data.units || []);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), symbol: symbol.trim() || null }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi thêm đơn vị');

      setName('');
      setSymbol('');
      fetchUnits();
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa đơn vị này?')) return;
    try {
      await fetch(`/api/units/${id}`, { method: 'DELETE' });
      fetchUnits();
    } catch {}
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Navbar title="Đơn vị tính (Units)" showBack backHref="/settings" />

      {/* Add Unit Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-sky-600" />
          <span>Thêm đơn vị tính mới</span>
        </h2>

        {error && <p className="text-xs text-rose-500 font-semibold">{error}</p>}

        <form onSubmit={handleAddUnit} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Tên đơn vị (ví dụ: cái, mét, kg, gói...)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />

          <input
            type="text"
            placeholder="Ký hiệu (m, kg, l...)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-28 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />

          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1 shrink-0"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>Thêm</span>
          </button>
        </form>
      </div>

      {/* Units List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase">
          <span>Danh sách đơn vị đang dùng</span>
          <span>{units.length} đơn vị</span>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {units.map((u) => (
              <div
                key={u.id}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">{u.name}</span>
                  {u.symbol && <span className="text-slate-400 ml-1.5 font-mono">({u.symbol})</span>}
                </div>

                {!u.isDefault && (
                  <button
                    onClick={() => handleDeleteUnit(u.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
