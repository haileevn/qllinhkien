'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Star,
  Copy,
  Check,
  Edit,
  Trash2,
  QrCode,
  ArrowLeftRight,
  Sliders,
  History,
  Package,
  Clock,
  Calendar,
  DollarSign,
  Tag as TagIcon,
  Barcode,
  Loader2,
  AlertCircle,
  Plus,
  Minus,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import QuantityModal from '@/components/QuantityModal';
import MoveLocationModal from '@/components/MoveLocationModal';
import { ITEM_CONDITIONS, TRANSACTION_TYPES } from '@/lib/inventory';

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [item, setItem] = useState<any>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Modals
  const [quantityModalOpen, setQuantityModalOpen] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) fetchItemDetails();
  }, [id]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/items/${id}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Không tìm thấy vật tư');
      }
      setItem(data.item);
      setBreadcrumbs(data.breadcrumbs || []);
      setSelectedImage(data.item.mainImage || (data.item.images?.[0]?.url ?? null));
    } catch (err: any) {
      setError(err.message || 'Lỗi tải thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!item) return;
    const newFav = !item.isFavorite;
    setItem({ ...item, isFavorite: newFav });
    try {
      await fetch(`/api/items/${item.id}/favorite`, { method: 'POST' });
    } catch {
      setItem({ ...item, isFavorite: !newFav });
    }
  };

  const fullLocationPath = [
    ...breadcrumbs.map((b) => b.name),
    item?.container,
    item?.exactPosition,
  ]
    .filter(Boolean)
    .join(' → ');

  const handleCopyLocation = () => {
    navigator.clipboard.writeText(fullLocationPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!item) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi xóa vật tư');
      }
      router.push('/items');
    } catch (err: any) {
      alert(err.message || 'Không thể xóa');
      setDeleting(false);
      setDeleteConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <span className="text-xs">Đang tải thông tin vật tư...</span>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Không tìm thấy vật tư</h2>
        <p className="text-xs text-slate-500">{error}</p>
        <Link
          href="/items"
          className="inline-block px-4 py-2 bg-sky-600 text-white text-xs font-semibold rounded-xl"
        >
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const condInfo = ITEM_CONDITIONS[item.condition] || ITEM_CONDITIONS.NEW;

  // All item images array
  const allImages = [
    item.mainImage,
    ...(item.images?.map((img: any) => img.url) || []),
  ].filter((u, i, arr) => u && arr.indexOf(u) === i);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <Navbar
        title={item.name}
        showBack
        backHref="/items"
        action={
          <button
            onClick={handleToggleFavorite}
            className="p-2 rounded-lg text-slate-400 hover:text-amber-500 transition-colors"
          >
            <Star
              className={`w-5 h-5 ${
                item.isFavorite
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-slate-300 dark:text-slate-600'
              }`}
            />
          </button>
        }
      />

      {/* Main Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Gallery Preview Left Column */}
          <div className="md:col-span-5 space-y-3">
            <div className="aspect-square rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 overflow-hidden relative flex items-center justify-center shadow-inner">
              {selectedImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedImage}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-16 h-16 text-slate-300 dark:text-slate-700" />
              )}
            </div>

            {/* Thumbnails list */}
            {allImages.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(img)}
                    className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      selectedImage === img
                        ? 'border-sky-600 scale-105'
                        : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Details Column */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-4">
            <div>
              {/* Category, Condition & Stock Status Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {item.category?.name}
                </span>

                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${condInfo.bg} ${condInfo.color}`}
                >
                  {condInfo.label}
                </span>

                {item.quantity === 0 ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                    Hết hàng
                  </span>
                ) : item.quantity <= item.minimumQuantity ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    Sắp hết
                  </span>
                ) : null}
              </div>

              {/* Product Title */}
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                {item.name}
              </h1>

              {/* Brand & Model & SKU */}
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                {item.brand && <span>Hãng: <strong className="text-slate-800 dark:text-slate-200">{item.brand}</strong></span>}
                {item.model && <span>&bull; Model: <strong className="text-slate-800 dark:text-slate-200">{item.model}</strong></span>}
                {item.sku && <span>&bull; SKU: <strong className="font-mono text-slate-800 dark:text-slate-200">{item.sku}</strong></span>}
              </div>

              {/* Prominent Storage Location Path */}
              <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-start justify-between gap-2 shadow-sm">
                <div className="flex items-start gap-2 text-xs text-slate-800 dark:text-slate-200">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-[11px] text-slate-400 font-semibold uppercase">Vị trí lưu trữ chính xác</div>
                    <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                      {fullLocationPath || 'Chưa phân vị trí'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCopyLocation}
                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-sky-600 flex items-center gap-1 shrink-0 shadow-xs transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quantity Counter Box */}
              <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-850 border border-sky-100 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Số lượng tồn</div>
                  <div className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400">
                    {item.quantity} <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{item.unit}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantityModalOpen(true)}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/30 flex items-center gap-1.5 transition-all"
                  >
                    <span>Điều chỉnh số lượng</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
              <Link
                href={`/items/${item.id}/edit`}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Sửa</span>
              </Link>

              <Link
                href={`/items/new?cloneFrom=${item.id}`}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Tạo vật tư mới dựa trên thông số của vật tư này"
              >
                <Copy className="w-3.5 h-3.5 text-sky-500" />
                <span>Nhân bản</span>
              </Link>

              <button
                onClick={() => setMoveModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-purple-500" />
                <span>Chuyển vị trí</span>
              </button>

              <Link
                href={`/items/${item.id}/qr`}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5 text-sky-500" />
                <span>In tem QR</span>
              </Link>

              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Specifications & Tags */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Specs Card */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Thông số & Ghi chú
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            {item.purchasePrice ? (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block text-[11px]">Giá mua:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.purchasePrice)}
                </strong>
              </div>
            ) : null}

            {item.purchaseDate ? (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block text-[11px]">Ngày mua:</span>
                <strong className="text-slate-800 dark:text-slate-200">
                  {new Date(item.purchaseDate).toLocaleDateString('vi-VN')}
                </strong>
              </div>
            ) : null}

            {item.supplier ? (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block text-[11px]">Nhà cung cấp:</span>
                <strong className="text-slate-800 dark:text-slate-200 truncate block">
                  {item.supplier}
                </strong>
              </div>
            ) : null}

            {item.barcode ? (
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800">
                <span className="text-slate-400 block text-[11px]">Mã vạch (Barcode):</span>
                <strong className="font-mono text-slate-800 dark:text-slate-200">
                  {item.barcode}
                </strong>
              </div>
            ) : null}
          </div>

          {/* Notes description */}
          {item.notes && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">Ghi chú kỹ thuật:</span>
              <p className="text-slate-600 dark:text-slate-400 whitespace-pre-line leading-relaxed">
                {item.notes}
              </p>
            </div>
          )}

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div>
              <span className="text-xs font-bold text-slate-400 block mb-1.5">Thẻ phân loại:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {item.tags.map((t: any) => (
                  <Link
                    key={t.tag.id}
                    href={`/search?tag=${encodeURIComponent(t.tag.name)}`}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:text-sky-600 transition-colors"
                  >
                    #{t.tag.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* QR Code Quick View Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col items-center justify-center text-center space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Mã định danh QR
          </h2>
          <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-2xl p-2 flex items-center justify-center border border-slate-200 dark:border-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                item.qrCodeValue || `ITEM:${item.id}`
              )}`}
              alt="QR Code"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="text-[11px] font-mono text-slate-500 truncate max-w-[200px]">
            {item.qrCodeValue || `ITEM:${item.id}`}
          </div>
          <Link
            href={`/items/${item.id}/qr`}
            className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:underline"
          >
            In nhãn dán QR này →
          </Link>
        </div>
      </div>

      {/* Transaction History Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <History className="w-5 h-5 text-purple-600" />
          <span>Lịch sử biến động & kho</span>
        </h2>

        {item.transactions && item.transactions.length > 0 ? (
          <div className="space-y-3">
            {item.transactions.map((tx: any) => {
              const info = TRANSACTION_TYPES[tx.type] || TRANSACTION_TYPES.ADJUSTMENT;
              return (
                <div
                  key={tx.id}
                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs ${info.badgeBg}`}
                    >
                      {info.prefix}
                      {tx.quantity} {item.unit}
                    </span>
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {info.label}: {tx.note || 'Không có ghi chú'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {tx.type === 'MOVE' && tx.sourceLocation && tx.destinationLocation
                          ? `Từ [${tx.sourceLocation.name}] sang [${tx.destinationLocation.name}]`
                          : `Số lượng: ${tx.previousQuantity} → ${tx.newQuantity}`}
                        {tx.createdBy && ` &bull; Bởi: ${tx.createdBy}`}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 text-right shrink-0">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    {new Date(tx.createdAt).toLocaleDateString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Chưa có ghi nhận giao dịch nào.
          </div>
        )}
      </div>

      {/* Modals */}
      {quantityModalOpen && (
        <QuantityModal
          isOpen={quantityModalOpen}
          onClose={() => setQuantityModalOpen(false)}
          itemId={item.id}
          itemName={item.name}
          currentQuantity={item.quantity}
          unit={item.unit}
          onSuccess={(updated) => {
            setItem((prev: any) => ({ ...prev, quantity: updated.quantity }));
            fetchItemDetails();
          }}
        />
      )}

      {moveModalOpen && (
        <MoveLocationModal
          isOpen={moveModalOpen}
          onClose={() => setMoveModalOpen(false)}
          itemId={item.id}
          itemName={item.name}
          currentLocationId={item.locationId}
          currentLocationName={item.location?.name || 'Vị trí cũ'}
          currentContainer={item.container}
          currentExactPosition={item.exactPosition}
          onSuccess={() => {
            fetchItemDetails();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm p-6 space-y-4 text-center border border-slate-200 dark:border-slate-800">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              Xác nhận xóa vật tư?
            </h3>
            <p className="text-xs text-slate-500">
              Bạn có chắc chắn muốn xóa &quot;{item.name}&quot;? Toàn bộ ảnh và lịch sử giao dịch liên quan sẽ bị xóa.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
