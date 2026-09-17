'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  X,
  Loader2,
  Package,
  Layers,
  MapPin,
  Filter,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ItemCard from '@/components/ItemCard';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    performSearch(query, selectedCategory, selectedCondition, selectedStatus);
  }, [query, selectedCategory, selectedCondition, selectedStatus]);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories?format=flat');
      const data = await res.json();
      if (res.ok && data.categories) {
        setCategories(data.categories);
      }
    } catch {}
  };

  const performSearch = async (
    q: string,
    catId: string,
    cond: string,
    stat: string
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (catId) params.set('categoryId', catId);
      if (cond) params.set('condition', cond);
      if (stat) params.set('status', stat);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        let filtered = data.results || [];
        if (catId) {
          filtered = filtered.filter((i: any) => i.category?.id === catId);
        }
        if (cond) {
          filtered = filtered.filter((i: any) => i.condition === cond);
        }
        if (stat === 'low_stock') {
          filtered = filtered.filter((i: any) => i.quantity <= i.minimumQuantity && i.quantity > 0);
        } else if (stat === 'out_of_stock') {
          filtered = filtered.filter((i: any) => i.quantity === 0);
        }
        setResults(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Navbar title="Tìm kiếm vật tư" />

      {/* Search Input Box */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm tên, SKU, mã vạch, hãng, ngăn, tủ... (hỗ trợ gõ không dấu)"
          autoFocus
          className="w-full pl-11 pr-10 py-3 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-3.5 p-0.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Chips Horizontal Scroll */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {/* All Category Pill */}
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
            !selectedCategory
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          Tất cả danh mục
        </button>

        {categories.slice(0, 8).map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
            className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
              selectedCategory === cat.id
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Sub-Filters: Stock Status & Condition */}
      <div className="flex items-center gap-2 text-xs flex-wrap">
        <span className="text-slate-400 text-[11px] font-medium">Trạng thái:</span>
        <button
          onClick={() => setSelectedStatus(selectedStatus === 'low_stock' ? '' : 'low_stock')}
          className={`px-2.5 py-1 rounded-lg border font-medium ${
            selectedStatus === 'low_stock'
              ? 'bg-amber-500 text-white border-amber-600'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          Sắp hết
        </button>
        <button
          onClick={() => setSelectedStatus(selectedStatus === 'out_of_stock' ? '' : 'out_of_stock')}
          className={`px-2.5 py-1 rounded-lg border font-medium ${
            selectedStatus === 'out_of_stock'
              ? 'bg-rose-500 text-white border-rose-600'
              : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          Hết hàng
        </button>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span>
          Tìm thấy <strong className="text-slate-900 dark:text-white font-bold">{results.length}</strong> kết quả
        </span>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-sky-600" />}
      </div>

      {/* Results Grid */}
      {loading && results.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span>Đang tìm kiếm...</span>
        </div>
      ) : results.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-2">
          <Package className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Không tìm thấy vật tư nào
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hãy thử tìm bằng từ khóa ngắn hơn, tên thương hiệu, mã SKU hoặc kiểm tra bộ lọc.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {results.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-400">Đang tải trang tìm kiếm...</div>}>
      <SearchContent />
    </Suspense>
  );
}
