'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Package,
  Boxes,
  AlertTriangle,
  XCircle,
  MapPin,
  Star,
  Plus,
  QrCode,
  ArrowRight,
  Clock,
  Sparkles,
  Layers,
  History,
  Loader2,
  RefreshCw,
  Folder,
  FolderOpen,
  Printer,
  ChevronRight,
  FolderKanban,
  Coins,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ItemCard from '@/components/ItemCard';

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchDashboard();
    loadRecentSearches();
  }, []);

  const loadRecentSearches = () => {
    try {
      const stored = localStorage.getItem('h2t_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      } else {
        setRecentSearches(['relay 5v', 'esp32', 'dây usb', 'mỏ hàn', 'ốc m3']);
      }
    } catch {
      setRecentSearches(['relay 5v', 'esp32', 'dây usb']);
    }
  };

  const saveRecentSearch = (term: string) => {
    try {
      const clean = term.trim();
      if (!clean) return;
      const updated = [clean, ...recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
      setRecentSearches(updated);
      localStorage.setItem('h2t_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  const fetchDashboard = async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        const now = new Date();
        setLastUpdated(
          now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Live debounced search
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
          setSearchResults(json.results || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleTagClick = (term: string) => {
    setSearchQuery(term);
    saveRecentSearch(term);
  };

  return (
    <div className="space-y-6">
      <Navbar
        title="H2T Home Inventory"
        action={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fetchDashboard(true)}
              disabled={refreshing || loading}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
              title="Làm mới dữ liệu tức thì"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-600' : ''}`} />
              <span className="hidden sm:inline">Làm mới</span>
            </button>
          </div>
        }
      />

      {/* Prominent Live Search Hero */}
      <section className="bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 rounded-3xl p-4 sm:p-7 text-white shadow-xl shadow-sky-700/20 relative overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-sky-200" />
              <span>Quản lý kho & Vật tư kỹ thuật H2T</span>
            </div>
            {lastUpdated && (
              <span className="text-[11px] text-sky-200/80 font-medium">
                Cập nhật: {lastUpdated}
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight mb-4 leading-tight">
            Bạn đang tìm vật tư, linh kiện nào?
          </h2>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="relative flex items-center">
              <Search className="w-5 h-5 absolute left-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên linh kiện, SKU, vị trí, tủ, ngăn..."
                className="w-full pl-11 pr-24 py-3.5 sm:py-4 text-sm sm:text-base font-medium rounded-2xl bg-white text-slate-900 placeholder-slate-400 shadow-2xl focus:outline-none focus:ring-4 focus:ring-sky-300/60"
              />
              <button
                type="submit"
                className="absolute right-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition-all"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Tìm'}
              </button>
            </div>
          </form>

          {/* Recent Search Keywords */}
          {recentSearches.length > 0 && !searchQuery && (
            <div className="mt-3.5 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-sky-200 font-medium flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Tìm gần đây:
              </span>
              {recentSearches.map((term, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleTagClick(term)}
                  className="text-xs bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-sm px-2.5 py-1 rounded-lg text-white font-medium border border-white/20 transition-all"
                >
                  {term}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Access Action Pills */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <Link
          href="/items/new"
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm vật tư mới</span>
        </Link>

        <Link
          href="/projects"
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          <FolderKanban className="w-4 h-4 text-amber-500" />
          <span>Dự án & BOM</span>
        </Link>

        <Link
          href="/analytics"
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          <Coins className="w-4 h-4 text-emerald-600" />
          <span>Báo cáo tài sản</span>
        </Link>

        <Link
          href="/scanner"
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          <QrCode className="w-4 h-4 text-sky-600" />
          <span>Quét Barcode / QR</span>
        </Link>

        <Link
          href="/print-labels"
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          <Printer className="w-4 h-4 text-purple-600" />
          <span>In tem nhãn QR</span>
        </Link>

        <Link
          href="/locations"
          className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span>Cây kho lưu trữ</span>
        </Link>
      </section>

      {/* Live Search Instant Results Dropdown / Preview */}
      {searchQuery.trim() && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
              <Search className="w-4 h-4 text-sky-600" />
              <span>Kết quả tìm kiếm ({searchResults.length})</span>
            </h3>
            <Link
              href={`/search?q=${encodeURIComponent(searchQuery)}`}
              className="text-xs font-semibold text-sky-600 hover:underline flex items-center gap-1"
            >
              Xem toàn bộ
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {searching ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
              <span>Đang tìm kiếm...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              Không tìm thấy vật tư nào khớp với &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.slice(0, 6).map((item) => (
                <ItemCard key={item.id} item={item} onItemUpdated={() => fetchDashboard(true)} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Key Metric Stat Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Item Types */}
        <Link
          href="/items"
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-800 transition-all shadow-sm group"
        >
          <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {loading ? '...' : data?.stats?.totalItemTypes ?? 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Chủng loại vật tư
          </div>
        </Link>

        {/* Total Quantity */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-2">
            <Package className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {loading ? '...' : data?.stats?.totalQuantity ?? 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tổng số lượng món
          </div>
        </div>

        {/* Low Stock */}
        <Link
          href="/low-stock"
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-700 transition-all shadow-sm group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {loading ? '...' : data?.stats?.lowStockCount ?? 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Sắp hết hàng
          </div>
        </Link>

        {/* Out of Stock */}
        <Link
          href="/low-stock?status=out_of_stock"
          className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-700 transition-all shadow-sm group"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <XCircle className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {loading ? '...' : data?.stats?.outOfStockCount ?? 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Hết hàng (0)
          </div>
        </Link>

        {/* Total Storage Locations */}
        <Link
          href="/locations"
          className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all shadow-sm group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">
            {loading ? '...' : data?.stats?.totalLocations ?? 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Vị trí lưu trữ
          </div>
        </Link>
      </section>

      {/* NEW SECTION: Tổng quan các khu vực kho & Tủ lưu trữ (Storage Locations Overview) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>Tổng quan các khu vực kho & Tủ lưu trữ</span>
          </h2>
          <Link
            href="/locations"
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
          >
            <span>Xem cây kho toàn bộ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          </div>
        ) : data?.locationsOverview && data.locationsOverview.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {data.locationsOverview.map((loc: any) => (
              <div
                key={loc.id}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-700 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/locations/${loc.id}`}
                          className="font-bold text-slate-900 dark:text-white text-sm hover:text-sky-600 truncate block"
                        >
                          {loc.name}
                        </Link>
                        {loc.code && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {loc.code}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {loc.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                      {loc.description}
                    </p>
                  )}

                  {/* Metrics in this location */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <div className="text-[10px] text-slate-400">Chủng loại</div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {loc.totalDescendantItemTypes ?? loc.directItemCount} loại
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-sky-50/60 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50">
                      <div className="text-[10px] text-sky-600 dark:text-sky-400">Tổng số lượng</div>
                      <div className="font-black text-sky-700 dark:text-sky-300">
                        {loc.totalQuantity ?? 0} món
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footers */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <Link
                    href={`/locations/${loc.id}`}
                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Mở kho</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href={`/items/new?locationId=${loc.id}`}
                    className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-[11px] font-medium"
                    title="Thêm đồ vào kho này"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm đồ</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            Chưa có khu vực kho nào được tạo.
          </div>
        )}
      </section>

      {/* Section: Hay dùng (Favorites) */}
      {data?.favorites && data.favorites.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Hay dùng ({data.favorites.length})</span>
            </h2>
            <Link
              href="/items?isFavorite=true"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              Xem tất cả →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.favorites.map((item: any) => (
              <ItemCard key={item.id} item={item} onItemUpdated={() => fetchDashboard(true)} />
            ))}
          </div>
        </section>
      )}

      {/* Section: Đồ mới thêm gần đây (Recently Added) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600" />
            <span>Mới thêm gần đây ({data?.recentlyAdded?.length || 0})</span>
          </h2>
          <Link
            href="/items?sort=created_desc"
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            Xem tất cả →
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          </div>
        ) : data?.recentlyAdded && data.recentlyAdded.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.recentlyAdded.map((item: any) => (
              <ItemCard key={item.id} item={item} onItemUpdated={() => fetchDashboard(true)} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            Chưa có vật tư nào trong hệ thống. Hãy nhấn &quot;Thêm vật tư mới&quot; để bắt đầu!
          </div>
        )}
      </section>

      {/* Section: Lịch sử biến động gần đây (Recent Transactions) */}
      {data?.recentTransactions && data.recentTransactions.length > 0 && (
        <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-600" />
              <span>Biến động kho gần đây</span>
            </h2>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
            >
              Xem nhật ký →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.recentTransactions.map((tx: any) => {
              const isPlus = tx.type === 'IN';
              const isMinus = tx.type === 'OUT';
              const isMove = tx.type === 'MOVE';

              return (
                <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isPlus
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : isMinus
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                      }`}
                    >
                      {isPlus ? '+' : isMinus ? '-' : '→'}
                    </span>
                    <div>
                      <Link
                        href={`/items/${tx.itemId}`}
                        className="font-semibold text-slate-800 dark:text-slate-200 hover:text-sky-600 dark:hover:text-sky-400 truncate max-w-[200px] sm:max-w-xs block"
                      >
                        {tx.item?.name}
                      </Link>
                      <span className="text-[11px] text-slate-400">
                        {tx.note || (isPlus ? 'Nhập thêm' : isMinus ? 'Đã dùng' : 'Chuyển vị trí')}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`font-bold ${
                        isPlus ? 'text-emerald-600' : isMinus ? 'text-rose-600' : 'text-purple-600'
                      }`}
                    >
                      {isPlus ? `+${tx.quantity}` : isMinus ? `-${tx.quantity}` : `${tx.quantity}`}{' '}
                      {tx.item?.unit}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </div>
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

