'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Folder,
  FolderOpen,
  Plus,
  QrCode,
  Edit,
  Trash2,
  ChevronRight,
  Package,
  Layers,
  Loader2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ItemCard from '@/components/ItemCard';

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [location, setLocation] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [descendantCount, setDescendantCount] = useState(0);

  useEffect(() => {
    if (id) fetchLocationDetails();
  }, [id]);

  const fetchLocationDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/locations/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi tải vị trí');
      }
      setLocation(data.location);
      setBreadcrumbs(data.breadcrumbs || []);
      setItems(data.items || []);
      setDescendantCount(data.descendantLocationCount || 0);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  const fullPath = breadcrumbs.map((b) => b.name).join(' → ');

  const handleCopyPath = () => {
    navigator.clipboard.writeText(fullPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <span className="text-xs">Đang tải vị trí lưu trữ...</span>
      </div>
    );
  }

  if (error || !location) {
    return (
      <div className="py-16 text-center space-y-3">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Không tìm thấy vị trí lưu trữ
        </h2>
        <p className="text-xs text-slate-400">{error}</p>
        <Link
          href="/locations"
          className="inline-block px-4 py-2 bg-sky-600 text-white text-xs font-bold rounded-xl"
        >
          Quay lại danh sách kho
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Navbar
        title={location.name}
        showBack
        backHref="/locations"
        action={
          <div className="flex items-center gap-1">
            <Link
              href={`/locations/${location.id}/qr`}
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1"
            >
              <QrCode className="w-4 h-4 text-sky-600" />
              <span className="hidden sm:inline">In tem QR</span>
            </Link>
          </div>
        }
      />

      {/* Header Info Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
        {/* Breadcrumb Navigation Chain */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
          <Link href="/locations" className="hover:text-sky-600">
            Kho
          </Link>
          {breadcrumbs.map((b, idx) => (
            <React.Fragment key={b.id}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
              {idx === breadcrumbs.length - 1 ? (
                <span className="font-bold text-slate-900 dark:text-white">{b.name}</span>
              ) : (
                <Link href={`/locations/${b.id}`} className="hover:text-sky-600 truncate max-w-[150px]">
                  {b.name}
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Title & Code */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {location.name}
              </h1>
              {location.code && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {location.code}
                </span>
              )}
            </div>
            {location.description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {location.description}
              </p>
            )}
          </div>

          <button
            onClick={handleCopyPath}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Đã chép đường dẫn' : 'Sao chép vị trí'}</span>
          </button>
        </div>

        {/* Counts summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-400 block text-[11px]">Tổng vật tư (gồm tầng con):</span>
            <span className="text-base font-black text-sky-600 dark:text-sky-400">
              {items.length} loại vật tư
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-400 block text-[11px]">Vị trí con trực tiếp:</span>
            <span className="text-base font-black text-slate-800 dark:text-slate-200">
              {location.children?.length || 0} nhánh
            </span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-400 block text-[11px]">Tổng vị trí nhánh con:</span>
            <span className="text-base font-black text-slate-800 dark:text-slate-200">
              {descendantCount} ô / ngăn
            </span>
          </div>
        </div>
      </div>

      {/* Direct Sub-Locations Grid */}
      {location.children && location.children.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Vị trí nhánh con trực tiếp ({location.children.length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {location.children.map((child: any) => (
              <Link
                key={child.id}
                href={`/locations/${child.id}`}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 hover:border-sky-400 dark:hover:border-sky-700 transition-all shadow-sm group"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Folder className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-sky-600">
                  {child.name}
                </h3>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>{child.code ? `[${child.code}]` : ''}</span>
                  <span className="text-sky-600 font-semibold">{child._count?.items || 0} món</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recursive Items Stored Inside this Location & Sub-locations */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-sky-600" />
            <span>Tất cả vật tư lưu tại đây ({items.length})</span>
          </h2>
          <Link
            href={`/items/new?locationId=${location.id}`}
            className="text-xs font-semibold text-sky-600 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm vật tư vào đây</span>
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-xs text-slate-500 space-y-2">
            <Package className="w-10 h-10 text-slate-300 mx-auto" />
            <p>Chưa có vật tư nào được lưu trong vị trí này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onItemUpdated={fetchLocationDetails} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
