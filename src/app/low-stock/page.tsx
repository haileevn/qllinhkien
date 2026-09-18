'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  XCircle,
  Package,
  Plus,
  Loader2,
  Filter,
  Coins,
  ArrowRight,
  ShoppingCart,
  ExternalLink,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ItemCard from '@/components/ItemCard';
import { detectShoppingPlatform } from '@/lib/shopping';
import { clsx } from 'clsx';

function LowStockContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'low' | 'out'>('all');

  useEffect(() => {
    if (initialStatus === 'out_of_stock') setActiveTab('out');
    else if (initialStatus === 'low_stock') setActiveTab('low');
    fetchLowStockItems();
  }, [initialStatus]);

  const fetchLowStockItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/items');
      const data = await res.json();
      if (res.ok) {
        // Filter items that are low or out of stock
        const filtered = (data.items || []).filter(
          (i: any) => i.quantity <= i.minimumQuantity
        );
        setItems(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const displayedItems = items.filter((item) => {
    if (activeTab === 'out') return item.quantity === 0;
    if (activeTab === 'low') return item.quantity > 0 && item.quantity <= item.minimumQuantity;
    return true;
  });

  const outOfStockCount = items.filter((i) => i.quantity === 0).length;
  const lowStockCount = items.filter((i) => i.quantity > 0 && i.quantity <= i.minimumQuantity).length;

  // Compute total estimated reorder budget
  const totalReorderEstimate = items.reduce((sum, item) => {
    const deficit = Math.max(0, item.minimumQuantity - item.quantity);
    const price = item.purchasePrice || 0;
    return sum + deficit * price;
  }, 0);

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <Navbar title="Cảnh báo tồn kho" />

      {/* Overview Alert Banner */}
      <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/20 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg leading-tight">
                Danh sách cần mua thêm / Bổ sung
              </h2>
              <p className="text-xs text-amber-100 mt-0.5">
                Gồm <strong>{outOfStockCount}</strong> vật tư hết hàng và <strong>{lowStockCount}</strong> vật tư chạm ngưỡng an toàn
              </p>
            </div>
          </div>

          <Link
            href="/items/new"
            className="px-3.5 py-2 bg-white text-amber-900 rounded-xl text-xs font-bold shadow-sm shrink-0 hover:bg-amber-50 transition-colors"
          >
            + Nhập mới
          </Link>
        </div>

        {/* Financial Reorder Estimate Card inside Banner */}
        {totalReorderEstimate > 0 && (
          <div className="p-3.5 rounded-2xl bg-black/15 backdrop-blur-md border border-white/20 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-200 shrink-0" />
              <div>
                <span className="text-amber-100">Dự toán ngân sách mua bù:</span>{' '}
                <strong className="text-white text-sm font-black">
                  {totalReorderEstimate.toLocaleString('vi-VN')} đ
                </strong>
              </div>
            </div>

            <Link
              href="/analytics"
              className="text-[11px] font-semibold text-white underline hover:opacity-80 shrink-0 flex items-center gap-0.5"
            >
              <span>Xem báo cáo tài sản</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Tất cả cần bổ sung ({items.length})
        </button>
        <button
          onClick={() => setActiveTab('low')}
          className={`flex-1 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'low'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Sắp hết ({lowStockCount})
        </button>
        <button
          onClick={() => setActiveTab('out')}
          className={`flex-1 py-2 rounded-xl font-bold transition-all ${
            activeTab === 'out'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Hết hàng ({outOfStockCount})
        </button>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          <span className="text-xs">Đang kiểm tra tồn kho...</span>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-2">
          <Package className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Kho hàng ổn định
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Không có vật tư nào trong mục này cần bổ sung.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
          {displayedItems.map((item) => (
            <ItemCard key={item.id} item={item} onItemUpdated={fetchLowStockItems} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LowStockPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-400">Đang tải cảnh báo...</div>}>
      <LowStockContent />
    </Suspense>
  );
}
