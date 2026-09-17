'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  Boxes,
  Package,
  AlertTriangle,
  FolderKanban,
  MapPin,
  Tag,
  ExternalLink,
  ShoppingCart,
  Sparkles,
  ArrowRight,
  Loader2,
  RefreshCw,
  Building2,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { detectShoppingPlatform } from '@/lib/shopping';
import { clsx } from 'clsx';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/analytics');
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
      </div>
    );
  }

  const summary = data?.summary || {};
  const valuationByLocation = data?.valuationByLocation || [];
  const valuationByCategory = data?.valuationByCategory || [];
  const topValuableItems = data?.topValuableItems || [];
  const lowStockItems = data?.lowStockItems || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <Navbar
        title="Báo cáo tài sản & Định giá kho"
        action={
          <button
            onClick={fetchAnalytics}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Tính toán lại"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Cập nhật</span>
          </button>
        }
      />

      {/* Hero Highlight Card */}
      <section className="bg-gradient-to-br from-emerald-600 via-teal-700 to-sky-800 rounded-3xl p-5 sm:p-7 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold border border-white/20 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
            <span>Tổng giá trị tài sản vật tư linh kiện</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-2">
            <span className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight">
              {(summary.totalAssetValue || 0).toLocaleString('vi-VN')} đ
            </span>
            <span className="text-xs text-emerald-100 font-medium">
              (Tính trên {summary.pricedItemsCount}/{summary.totalItemsCount} loại linh kiện đã nhập giá)
            </span>
          </div>

          <p className="text-xs sm:text-sm text-emerald-50 max-w-2xl leading-relaxed mt-2">
            Tổng giá trị tài sản hiện diện trong các tủ, ngăn kéo và kho lưu trữ. Bạn có thể sử dụng số liệu này để thống kê chi phí đầu tư phòng lab, xưởng DIY hoặc phục vụ kế hoạch mua sắm.
          </p>
        </div>
      </section>

      {/* 4 Financial Metric Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
            <Package className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {summary.totalStockQuantity?.toLocaleString('vi-VN') || 0}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">Tổng số lượng linh kiện</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
            {(summary.activeProjectsBOMValue || 0).toLocaleString('vi-VN')} đ
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Giá trị BOM ({summary.activeProjectsCount || 0} dự án đang làm)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {(summary.lowStockReorderTotalCost || 0).toLocaleString('vi-VN')} đ
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Dự toán mua bù ({summary.lowStockCount || 0} món sắp hết)
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {summary.totalItemsCount || 0}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Chủng loại ({summary.pricedItemsCount} đã có giá)
          </div>
        </div>
      </section>

      {/* Breakdown Section: Valuation by Location & Category */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* By Storage Location */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Giá trị tài sản theo Vị trí & Tủ đồ</span>
            </h2>
            <Link href="/locations" className="text-xs text-sky-600 hover:underline">
              Xem cây kho →
            </Link>
          </div>

          <div className="space-y-3">
            {valuationByLocation.slice(0, 6).map((loc: any) => {
              const pct = summary.totalAssetValue > 0 ? Math.round((loc.totalValue / summary.totalAssetValue) * 100) : 0;

              return (
                <div key={loc.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-800 dark:text-slate-200 truncate">{loc.name} ({loc.itemsCount} loại)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {loc.totalValue.toLocaleString('vi-VN')} đ ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Category */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Tag className="w-4 h-4 text-indigo-600" />
              <span>Giá trị tài sản theo Danh mục</span>
            </h2>
            <Link href="/categories" className="text-xs text-sky-600 hover:underline">
              Xem danh mục →
            </Link>
          </div>

          <div className="space-y-3">
            {valuationByCategory.slice(0, 6).map((cat: any) => {
              const pct = summary.totalAssetValue > 0 ? Math.round((cat.totalValue / summary.totalAssetValue) * 100) : 0;

              return (
                <div key={cat.id} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-slate-800 dark:text-slate-200 truncate">{cat.name} ({cat.itemsCount} loại)</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {cat.totalValue.toLocaleString('vi-VN')} đ ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Top 10 High Value Assets Table */}
      <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sky-600" />
            <span>Top 10 linh kiện có tổng giá trị cao nhất trong kho</span>
          </h2>
          <Link href="/items?sort=qty_desc" className="text-xs text-sky-600 hover:underline">
            Xem tất cả →
          </Link>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {topValuableItems.map((item: any, idx: number) => {
            const shopPlatform = detectShoppingPlatform(item.purchaseUrl);

            return (
              <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold flex items-center justify-center text-[11px] shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/items/${item.id}`}
                      className="font-bold text-slate-900 dark:text-white hover:text-sky-600 truncate block"
                    >
                      {item.name}
                    </Link>
                    <div className="text-[11px] text-slate-400">
                      Tồn kho: <strong className="text-slate-700 dark:text-slate-300">{item.quantity} {item.unit}</strong> &bull; Đơn giá: {item.purchasePrice ? `${item.purchasePrice.toLocaleString('vi-VN')} đ` : 'Chưa đặt'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-black text-slate-900 dark:text-white text-sm">
                      {item.totalItemValue.toLocaleString('vi-VN')} đ
                    </div>
                  </div>

                  {item.purchaseUrl && (
                    <a
                      href={item.purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300"
                      title={`Mở link mua trên ${shopPlatform.name}`}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Low Stock Reorder Estimations Table with Direct Buy Links */}
      {lowStockItems.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Dự toán kinh phí đặt mua bù linh kiện sắp hết ({lowStockItems.length} món)</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Ước tính cần chuẩn bị khoảng <strong>{(summary.lowStockReorderTotalCost || 0).toLocaleString('vi-VN')} đ</strong> để nhập bổ sung
              </p>
            </div>
            <Link href="/low-stock" className="text-xs text-sky-600 hover:underline">
              Xem chi tiết →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {lowStockItems.slice(0, 8).map((item: any) => {
              const shopPlatform = detectShoppingPlatform(item.purchaseUrl);

              return (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <Link
                      href={`/items/${item.id}`}
                      className="font-bold text-slate-900 dark:text-white hover:text-sky-600 truncate block"
                    >
                      {item.name}
                    </Link>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400">
                      Hiện còn: <strong>{item.quantity} {item.unit}</strong> (ngưỡng tối thiểu: {item.minimumQuantity}) &bull; Cần mua thêm: <strong>{item.neededQty} {item.unit}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {item.estCost > 0 ? `${item.estCost.toLocaleString('vi-VN')} đ` : 'Chưa có giá'}
                      </div>
                    </div>

                    {item.purchaseUrl ? (
                      <a
                        href={item.purchaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={clsx(
                          'px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-transform hover:scale-105',
                          shopPlatform.badgeBg,
                          shopPlatform.textColor,
                          shopPlatform.borderColor
                        )}
                        title={`Mua lại trên ${shopPlatform.name}`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Mua {shopPlatform.name}</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    ) : (
                      <Link
                        href={`/items/${item.id}/edit`}
                        className="text-[11px] text-slate-400 hover:text-sky-600 underline"
                      >
                        + Thêm link mua
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
