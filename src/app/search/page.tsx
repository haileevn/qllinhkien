'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  X,
  Loader2,
  Package,
  Layers,
  MapPin,
  Filter,
  FolderKanban,
  Box,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ItemCard from '@/components/ItemCard';
import { clsx } from 'clsx';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'items' | 'projects' | 'locations'>('all');
  const [items, setItems] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ itemsCount: 0, projectsCount: 0, locationsCount: 0, total: 0 });
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
        let filteredItems = data.results || [];
        if (catId) {
          filteredItems = filteredItems.filter((i: any) => i.category?.id === catId);
        }
        if (cond) {
          filteredItems = filteredItems.filter((i: any) => i.condition === cond);
        }
        if (stat === 'low_stock') {
          filteredItems = filteredItems.filter((i: any) => i.quantity <= i.minimumQuantity && i.quantity > 0);
        } else if (stat === 'out_of_stock') {
          filteredItems = filteredItems.filter((i: any) => i.quantity === 0);
        }

        setItems(filteredItems);
        setProjects(data.projects || []);
        setLocations(data.locations || []);
        setStats({
          itemsCount: filteredItems.length,
          projectsCount: (data.projects || []).length,
          locationsCount: (data.locations || []).length,
          total: filteredItems.length + (data.projects || []).length + (data.locations || []).length,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const hasAnyResults = items.length > 0 || projects.length > 0 || locations.length > 0;

  return (
    <div className="space-y-4">
      <Navbar title="Tìm kiếm thông minh" />

      {/* Search Input Box */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm vật tư, SKU, dự án BOM, vị trí, ngăn kéo... (gõ không dấu)"
          autoFocus
          className="w-full pl-11 pr-10 py-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm focus:ring-2 focus:ring-sky-500 focus:outline-none text-slate-900 dark:text-white font-medium"
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

      {/* Main Entity Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('all')}
          className={clsx(
            'flex-1 py-2 px-3 rounded-xl font-bold transition-all text-center shrink-0',
            activeTab === 'all'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          )}
        >
          Tất cả ({stats.total})
        </button>

        <button
          onClick={() => setActiveTab('items')}
          className={clsx(
            'flex-1 py-2 px-3 rounded-xl font-bold transition-all text-center shrink-0 flex items-center justify-center gap-1.5',
            activeTab === 'items'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          )}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Vật tư ({stats.itemsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={clsx(
            'flex-1 py-2 px-3 rounded-xl font-bold transition-all text-center shrink-0 flex items-center justify-center gap-1.5',
            activeTab === 'projects'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          )}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Dự án BOM ({stats.projectsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('locations')}
          className={clsx(
            'flex-1 py-2 px-3 rounded-xl font-bold transition-all text-center shrink-0 flex items-center justify-center gap-1.5',
            activeTab === 'locations'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          )}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Vị trí kho ({stats.locationsCount})</span>
        </button>
      </div>

      {/* Category Chips (When viewing Items or All) */}
      {(activeTab === 'all' || activeTab === 'items') && (
        <>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-3 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                !selectedCategory
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
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

          <div className="flex items-center gap-2 text-xs flex-wrap">
            <span className="text-slate-400 text-[11px] font-medium">Lọc tồn kho:</span>
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
        </>
      )}

      {/* Results Section */}
      {loading && !hasAnyResults ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span>Đang tìm kiếm...</span>
        </div>
      ) : !hasAnyResults ? (
        <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 space-y-2">
          <Package className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Không tìm thấy kết quả nào
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Hãy thử tìm bằng từ khóa ngắn hơn, tên thương hiệu, tên dự án, vị trí ngăn hoặc kiểm tra bộ lọc.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Projects Results */}
          {(activeTab === 'all' || activeTab === 'projects') && projects.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5" />
                  <span>Dự án & Bộ BOM ({projects.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {projects.map((proj) => (
                  <Link
                    key={proj.id}
                    href={`/projects/${proj.id}`}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-700 transition-all shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 transition-colors">
                        {proj.name}
                      </div>
                      <span
                        className={clsx(
                          'text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0',
                          proj.isReady
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                        )}
                      >
                        {proj.isReady ? 'Đủ linh kiện' : `Sẵn sàng: ${proj.fulfilledCount}/${proj.itemCount}`}
                      </span>
                    </div>

                    {proj.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5">
                        {proj.description}
                      </p>
                    )}

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span>{proj.itemCount} loại linh kiện trong BOM</span>
                      <span className="text-amber-600 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                        Xem chi tiết <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Locations Results */}
          {(activeTab === 'all' || activeTab === 'locations') && locations.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                <span>Vị trí lưu trữ & Tủ ngăn ({locations.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {locations.map((loc) => (
                  <Link
                    key={loc.id}
                    href={`/locations/${loc.id}`}
                    className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 transition-all shadow-sm group flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Box className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 truncate">
                        {loc.name}
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {loc.path}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Items Results */}
          {(activeTab === 'all' || activeTab === 'items') && items.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span>Vật tư linh kiện ({items.length})</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
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
