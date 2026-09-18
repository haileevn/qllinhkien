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
  Printer,
  ClipboardCheck,
  Coins,
  Radio,
  ArrowRightLeft,
  Camera,
  Maximize2,
  X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import ItemCard from '@/components/ItemCard';
import NfcModal from '@/components/NfcModal';
import EditLocationModal from '@/components/EditLocationModal';
import DeleteLocationModal from '@/components/DeleteLocationModal';
import ImageLightboxModal from '@/components/ImageLightboxModal';

export default function LocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [location, setLocation] = useState<any>(null);
  const [allLocations, setAllLocations] = useState<any[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [descendantCount, setDescendantCount] = useState(0);

  // Modals
  const [nfcModalOpen, setNfcModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchLocationDetails();
      fetchAllLocations();
    }
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

  const fetchAllLocations = async () => {
    try {
      const res = await fetch('/api/locations?format=flat');
      const data = await res.json();
      if (data.locations) {
        setAllLocations(data.locations);
      }
    } catch {}
  };

  const fullPath = breadcrumbs.map((b) => b.name).join(' → ');

  const handleCopyPath = () => {
    navigator.clipboard.writeText(fullPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const totalValuation = items.reduce(
    (sum, item) =>
      sum +
      (Number(item.purchasePrice) || Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );

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
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setEditModalOpen(true)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Đổi tên / Chỉnh sửa / Chuyển vị trí cha"
            >
              <Edit className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span className="hidden sm:inline">Sửa / Chuyển</span>
            </button>

            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-xs font-semibold flex items-center gap-1.5 border border-rose-200 dark:border-rose-800/80 transition-colors"
              title="Xóa vị trí lưu trữ này"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Xóa</span>
            </button>

            <button
              type="button"
              onClick={() => setNfcModalOpen(true)}
              className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-medium flex items-center gap-1 border border-indigo-200 dark:border-indigo-800/80 transition-colors"
              title="Ghi thẻ NFC / Tem thông minh cho vị trí hoặc tủ này"
            >
              <Radio className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thẻ NFC</span>
            </button>

            <Link
              href={`/locations/${location.id}/qr`}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-800"
              title="In tem định danh vị trí"
            >
              <QrCode className="w-3.5 h-3.5 text-sky-600" />
              <span className="hidden sm:inline">Tem vị trí</span>
            </Link>
          </div>
        }
      />

      {/* Header Info Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
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
                <Link
                  href={`/locations/${b.id}`}
                  className="hover:text-sky-600 truncate max-w-[150px]"
                >
                  {b.name}
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Real-life Location / Box Photo Banner if available */}
        {location.image && (
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 group shadow-md max-h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={location.image}
              alt={location.name}
              className="w-full h-52 sm:h-64 object-cover object-center cursor-pointer group-hover:scale-102 transition-transform duration-300"
              onClick={() => setPreviewImage(location.image)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end justify-between p-3.5 pointer-events-none">
              <span className="px-2.5 py-1 rounded-lg bg-black/60 text-white text-xs font-bold backdrop-blur-md flex items-center gap-1.5 border border-white/20">
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>Ảnh chụp thực tế Box / Vị trí</span>
              </span>

              <button
                type="button"
                onClick={() => setPreviewImage(location.image)}
                className="pointer-events-auto px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-all"
                title="Xem ảnh phóng to"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Phóng to ảnh</span>
              </button>
            </div>
          </div>
        )}

        {/* Title & Code */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                {location.name}
              </h1>
              {location.code && (
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
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

          <div className="flex items-center gap-2 flex-wrap self-start">
            <button
              onClick={() => setEditModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Chỉnh sửa kho</span>
            </button>

            <button
              onClick={handleCopyPath}
              className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copied ? 'Đã chép đường dẫn' : 'Sao chép vị trí'}</span>
            </button>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="flex items-center gap-2 flex-wrap pt-2">
          <button
            type="button"
            onClick={() => setEditModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-sky-600" />
            <span>Đổi tên / Chuyển vị trí</span>
          </button>

          <Link
            href={`/print-labels?locationId=${location.id}`}
            className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-sky-600" />
            <span>In tem nhãn</span>
          </Link>

          <Link
            href={`/audit?locationId=${location.id}`}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
            <span>Kiểm kê</span>
          </Link>

          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span>Xóa kho</span>
          </button>

          <Link
            href={`/items/new?locationId=${location.id}`}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 text-xs font-bold flex items-center gap-1.5 ml-auto transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm vật tư</span>
          </Link>
        </div>

        {/* Counts & Valuation summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-400 block text-[11px]">Tổng loại vật tư:</span>
            <span className="text-base font-black text-sky-600 dark:text-sky-400">
              {items.length} loại
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-400 block text-[11px]">Tổng số lượng tồn:</span>
            <span className="text-base font-black text-slate-800 dark:text-slate-200">
              {totalQuantity.toLocaleString('vi-VN')} món
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-400 block text-[11px]">Định giá tài sản:</span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {totalValuation.toLocaleString('vi-VN')} đ
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-slate-400 block text-[11px]">Vị trí nhánh con:</span>
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
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 hover:border-sky-400 dark:hover:border-sky-700 transition-all shadow-sm group flex flex-col justify-between"
              >
                <div>
                  {child.image ? (
                    <div className="relative w-full h-24 rounded-xl overflow-hidden mb-2 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={child.image}
                        alt={child.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-bold backdrop-blur-xs flex items-center gap-0.5">
                        <Camera className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                      <Folder className="w-4 h-4" />
                    </div>
                  )}
                  <h3 className="font-bold text-slate-900 dark:text-white text-xs truncate group-hover:text-sky-600">
                    {child.name}
                  </h3>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} onItemUpdated={fetchLocationDetails} />
            ))}
          </div>
        )}
      </section>

      {/* Edit / Move / Rename Location Modal */}
      {editModalOpen && (
        <EditLocationModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          location={location}
          allLocations={allLocations}
          onSaved={() => {
            fetchLocationDetails();
            fetchAllLocations();
          }}
        />
      )}

      {/* Delete Location Modal */}
      {deleteModalOpen && (
        <DeleteLocationModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          location={{
            id: location.id,
            name: location.name,
            code: location.code,
            totalItemsCount: items.length,
          }}
          onDeleted={() => {
            router.push('/locations');
          }}
        />
      )}

      {/* NFC Tag Writer Modal */}
      {nfcModalOpen && (
        <NfcModal
          isOpen={nfcModalOpen}
          onClose={() => setNfcModalOpen(false)}
          title={`Vị trí: ${location.name}`}
          subtitle={fullPath}
          code={location.code || location.name}
          urlPath={`/locations/${location.id}`}
        />
      )}
      {/* Zoom Modal for Location Photo */}
      {previewImage && (
        <ImageLightboxModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          images={[{ url: previewImage, title: `Ảnh chụp thực tế: ${location.name}` }]}
          title={`Vị trí: ${location.name}`}
        />
      )}
    </div>
  );
}
