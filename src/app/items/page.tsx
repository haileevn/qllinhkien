'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  Loader2,
  Package,
  Layers,
  ArrowUpDown,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ItemCard from '@/components/ItemCard';
import { buildHierarchyOptions } from '@/lib/tree-utils';

function ItemsListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Filters
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') || '');
  const [locationId, setLocationId] = useState(searchParams.get('locationId') || '');
  const [condition, setCondition] = useState(searchParams.get('condition') || '');
  const [status, setStatus] = useState(searchParams.get('status') || 'all');
  const [isFavorite, setIsFavorite] = useState(searchParams.get('isFavorite') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'updated_desc');

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchItems();
  }, [q, categoryId, locationId, condition, status, isFavorite, sort]);

  const fetchFiltersData = async () => {
    try {
      const [catsRes, locsRes] = await Promise.all([
        fetch('/api/categories?format=flat'),
        fetch('/api/locations?format=flat'),
      ]);
      const [catsData, locsData] = await Promise.all([catsRes.json(), locsRes.json()]);
      if (catsData.categories) setCategories(catsData.categories);
      if (locsData.locations) setLocations(locsData.locations);
    } catch {}
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (categoryId) params.set('categoryId', categoryId);
      if (locationId) params.set('locationId', locationId);
      if (condition) params.set('condition', condition);
      if (status && status !== 'all') params.set('status', status);
      if (isFavorite) params.set('isFavorite', isFavorite);
      if (sort) params.set('sort', sort);

      const res = await fetch(`/api/items?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <Navbar
        title="Danh sách vật tư"
        action={
          <div className="flex items-center gap-1.5">
            <Link
              href="/categories"
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Quản lý thêm sửa xóa danh mục"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Danh mục</span>
            </Link>

            <Link
              href="/items/new"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm</span>
            </Link>
          </div>
        }
      />

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên, SKU, hãng, mã vạch..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
          />
        </div>

        {/* Filter Selectors Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Category Filter */}
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none font-mono text-[11px]"
          >
            <option value="">📁 Tất cả danh mục</option>
            {buildHierarchyOptions(categories).map((c) => (
              <option key={c.id} value={c.id}>
                {c.formattedOptionLabel}
              </option>
            ))}
          </select>

          {/* Location Filter */}
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none font-mono text-[11px]"
          >
            <option value="">📦 Tất cả vị trí</option>
            {buildHierarchyOptions(locations).map((l) => (
              <option key={l.id} value={l.id}>
                {l.formattedOptionLabel}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">Tất cả tồn kho</option>
            <option value="in_stock">Còn hàng</option>
            <option value="low_stock">Sắp hết hàng</option>
            <option value="out_of_stock">Hết hàng (0)</option>
          </select>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="updated_desc">Mới cập nhật</option>
            <option value="created_desc">Mới thêm</option>
            <option value="name_asc">Tên (A-Z)</option>
            <option value="name_desc">Tên (Z-A)</option>
            <option value="qty_desc">Số lượng (Nhiều nhất)</option>
            <option value="qty_asc">Số lượng (Ít nhất)</option>
          </select>
        </div>
      </div>

      {/* Items Summary Bar */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>
          Hiển thị <strong className="text-slate-900 dark:text-white font-bold">{items.length}</strong> vật tư
        </span>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-sky-600" />}
      </div>

      {/* Items Grid */}
      {loading && items.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
          <span className="text-xs">Đang tải danh sách...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-3">
          <Package className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Chưa có vật tư nào
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Không tìm thấy vật tư phù hợp với bộ lọc hiện tại.
          </p>
          <Link
            href="/items/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm vật tư đầu tiên</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onItemUpdated={fetchItems} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ItemsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-400">Đang tải...</div>}>
      <ItemsListContent />
    </Suspense>
  );
}
